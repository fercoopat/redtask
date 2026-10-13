# Only this disposable Compose service may initialize the local acceptance data.
abort 'This seed requires the isolated SQLite test container' unless
  ENV['REDMINE_LOCAL_TEST'] == '1' &&
  ActiveRecord::Base.connection.adapter_name == 'SQLite' &&
  ActiveRecord::Base.connection_db_config.database == 'sqlite/redmine.db'

require 'json'
require 'rake'
Rails.application.load_tasks
unless Tracker.exists?
  ENV['REDMINE_LANG'] = 'es'
  Rake::Task['redmine:load_default_data'].invoke
end

fixture = nil
ActiveRecord::Base.transaction do
  Setting.rest_api_enabled = '1'
  Setting.default_language = 'es'
  Setting.login_required = '1'

  admin = User.find_by!(login: 'admin')
  admin.password = admin.password_confirmation = 'LocalRedmineAdmin123!'
  admin.must_change_passwd = false
  admin.mail_notification = 'none'
  admin.save!

  creator_role = Role.find_or_initialize_by(name: 'Local QA Creator')
  creator_role.permissions = [:view_issues, :add_issues]
  creator_role.save!
  reader_role = Role.find_or_initialize_by(name: 'Local QA Reader')
  reader_role.permissions = [:view_issues]
  reader_role.save!
  # New issues need initial-status workflow permissions in addition to Add issues.
  source_role = Role.where(builtin: 0).where.not(id: [creator_role.id, reader_role.id]).first!
  WorkflowTransition.where(role_id: creator_role.id).delete_all
  WorkflowTransition.where(role_id: source_role.id).each do |transition|
    copy = transition.dup
    copy.role_id = creator_role.id
    copy.save!
  end

  users = {}
  {creator: creator_role, reader: reader_role}.each do |kind, role|
    user = User.find_or_initialize_by(login: "qa-#{kind}")
    user.firstname = 'Local QA'
    user.lastname = kind.to_s.capitalize
    user.mail = "qa-#{kind}@redmine.local.test"
    user.admin = false
    user.status = User::STATUS_ACTIVE
    if user.new_record?
      user.password = user.password_confirmation = 'LocalRedmineQA123!'
    end
    user.must_change_passwd = false
    user.mail_notification = 'none'
    user.save!
    users[kind] = user
  end

  projects = []
  2.times do |index|
    tracker = Tracker.order(:id).offset(index).first!
    project = Project.find_or_initialize_by(identifier: "local-qa-#{index + 1}")
    project.name = "Local QA #{index + 1}"
    project.is_public = false
    project.enabled_module_names = ['issue_tracking']
    project.trackers = [tracker]
    project.save!
    users.each do |kind, user|
      member = Member.find_or_initialize_by(project: project, user: user)
      member.roles = [kind == :creator ? creator_role : reader_role]
      member.save!
    end
    category = IssueCategory.find_or_initialize_by(project: project, name: "QA category #{index + 1}")
    category.save!
    field = IssueCustomField.find_or_initialize_by(name: "QA required #{index + 1}")
    field.field_format = 'string'
    field.is_required = true
    field.is_for_all = false
    field.is_filter = true
    field.visible = true
    field.trackers = [tracker]
    field.projects = [project]
    field.save!
    project.issue_custom_fields = [field]
    project.save!
    projects << {id: project.id, identifier: project.identifier, trackerId: tracker.id,
                 categoryId: category.id, customFieldId: field.id}
  end

  fixture = {environment: 'redmine-ui-local-test', version: Redmine::VERSION.to_s,
             users: users.transform_values { |user| {id: user.id, login: user.login, apiKey: user.api_key} },
             projects: projects}
  raise 'Creator permission missing' unless users[:creator].allowed_to?(:add_issues, Project.find(projects.first[:id]))
  raise 'Reader unexpectedly has creation permission' if users[:reader].allowed_to?(:add_issues, Project.find(projects.first[:id]))
end

File.write('sqlite/test-fixture.json', JSON.pretty_generate(fixture))
File.chmod(0600, 'sqlite/test-fixture.json')
puts 'Local Redmine test data ready. Fixture credentials remain inside the test volume.'
