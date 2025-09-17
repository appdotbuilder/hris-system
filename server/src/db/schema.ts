import { serial, text, pgTable, timestamp, integer, pgEnum, date, numeric, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const genderEnum = pgEnum('gender', ['Male', 'Female', 'Other']);
export const maritalStatusEnum = pgEnum('marital_status', ['Single', 'Married', 'Divorced', 'Widowed']);
export const employmentStatusEnum = pgEnum('employment_status', ['Active', 'On Leave', 'Terminated']);
export const userRoleEnum = pgEnum('user_role', ['Admin', 'Manager', 'Employee']);
export const leaveTypeEnum = pgEnum('leave_type', ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Maternity Leave', 'Paternity Leave']);
export const leaveStatusEnum = pgEnum('leave_status', ['Pending', 'Approved', 'Rejected']);
export const payrollComponentTypeEnum = pgEnum('payroll_component_type', ['Allowance', 'Deduction']);
export const performanceGoalStatusEnum = pgEnum('performance_goal_status', ['Not Started', 'In Progress', 'Completed', 'Canceled']);
export const jobVacancyStatusEnum = pgEnum('job_vacancy_status', ['Open', 'Closed']);
export const applicantStatusEnum = pgEnum('applicant_status', ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']);

// Departments Table
export const departmentsTable = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Employees Table
export const employeesTable = pgTable('employees', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  employeeId: varchar('employee_id', { length: 50 }).notNull().unique(),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: genderEnum('gender').notNull(),
  maritalStatus: maritalStatusEnum('marital_status').notNull(),
  address: text('address'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  position: text('position'),
  department: text('department'),
  managerId: varchar('manager_id', { length: 50 }),
  startDate: date('start_date').notNull(),
  employmentStatus: employmentStatusEnum('employment_status').notNull().default('Active'),
  bankName: text('bank_name'),
  bankAccountNumber: text('bank_account_number'),
  role: userRoleEnum('role').notNull().default('Employee'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Employee Documents Table
export const employeeDocumentsTable = pgTable('employee_documents', {
  id: serial('id').primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  documentName: text('document_name').notNull(),
  documentType: text('document_type').notNull(),
  fileUrl: text('file_url').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Attendance Table
export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  checkInTime: timestamp('check_in_time').notNull(),
  checkOutTime: timestamp('check_out_time'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Leave Requests Table
export const leaveRequestsTable = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  leaveType: leaveTypeEnum('leave_type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: text('reason').notNull(),
  status: leaveStatusEnum('status').notNull().default('Pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Leave Balances Table
export const leaveBalancesTable = pgTable('leave_balances', {
  id: serial('id').primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull().unique(),
  annualLeaveBalance: integer('annual_leave_balance').notNull().default(0),
  sickLeaveBalance: integer('sick_leave_balance').notNull().default(0),
  personalLeaveBalance: integer('personal_leave_balance').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Payroll Components Table
export const payrollComponentsTable = pgTable('payroll_components', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  type: payrollComponentTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Employee Salary Structure Table
export const employeeSalaryStructureTable = pgTable('employee_salary_structure', {
  id: serial('id').primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  componentId: integer('component_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Payslips Table
export const payslipsTable = pgTable('payslips', {
  id: serial('id').primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  payPeriodStart: date('pay_period_start').notNull(),
  payPeriodEnd: date('pay_period_end').notNull(),
  grossSalary: numeric('gross_salary', { precision: 10, scale: 2 }).notNull(),
  totalAllowances: numeric('total_allowances', { precision: 10, scale: 2 }).notNull(),
  totalDeductions: numeric('total_deductions', { precision: 10, scale: 2 }).notNull(),
  netSalary: numeric('net_salary', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Performance Goals Table
export const performanceGoalsTable = pgTable('performance_goals', {
  id: serial('id').primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  status: performanceGoalStatusEnum('status').notNull().default('Not Started'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Performance Reviews Table
export const performanceReviewsTable = pgTable('performance_reviews', {
  id: serial('id').primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  reviewerId: varchar('reviewer_id', { length: 50 }).notNull(),
  reviewDate: date('review_date').notNull(),
  overallRating: integer('overall_rating').notNull(),
  comments: text('comments'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Job Vacancies Table
export const jobVacanciesTable = pgTable('job_vacancies', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  departmentId: integer('department_id'),
  status: jobVacancyStatusEnum('status').notNull().default('Open'),
  postedDate: date('posted_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Applicants Table
export const applicantsTable = pgTable('applicants', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  resumeUrl: text('resume_url'),
  jobVacancyId: integer('job_vacancy_id').notNull(),
  applicationDate: date('application_date').notNull(),
  status: applicantStatusEnum('status').notNull().default('Applied'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const employeesRelations = relations(employeesTable, ({ one, many }) => ({
  manager: one(employeesTable, {
    fields: [employeesTable.managerId],
    references: [employeesTable.employeeId],
    relationName: 'manager'
  }),
  subordinates: many(employeesTable, { relationName: 'manager' }),
  documents: many(employeeDocumentsTable),
  attendance: many(attendanceTable),
  leaveRequests: many(leaveRequestsTable),
  leaveBalance: one(leaveBalancesTable),
  salaryStructure: many(employeeSalaryStructureTable),
  payslips: many(payslipsTable),
  performanceGoals: many(performanceGoalsTable),
  performanceReviews: many(performanceReviewsTable),
  reviewsAsReviewer: many(performanceReviewsTable, {
    relationName: 'reviewer'
  })
}));

export const departmentsRelations = relations(departmentsTable, ({ many }) => ({
  jobVacancies: many(jobVacanciesTable)
}));

export const employeeDocumentsRelations = relations(employeeDocumentsTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [employeeDocumentsTable.employeeId],
    references: [employeesTable.employeeId]
  })
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [attendanceTable.employeeId],
    references: [employeesTable.employeeId]
  })
}));

export const leaveRequestsRelations = relations(leaveRequestsTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [leaveRequestsTable.employeeId],
    references: [employeesTable.employeeId]
  })
}));

export const leaveBalancesRelations = relations(leaveBalancesTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [leaveBalancesTable.employeeId],
    references: [employeesTable.employeeId]
  })
}));

export const employeeSalaryStructureRelations = relations(employeeSalaryStructureTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [employeeSalaryStructureTable.employeeId],
    references: [employeesTable.employeeId]
  }),
  component: one(payrollComponentsTable, {
    fields: [employeeSalaryStructureTable.componentId],
    references: [payrollComponentsTable.id]
  })
}));

export const payrollComponentsRelations = relations(payrollComponentsTable, ({ many }) => ({
  salaryStructures: many(employeeSalaryStructureTable)
}));

export const payslipsRelations = relations(payslipsTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [payslipsTable.employeeId],
    references: [employeesTable.employeeId]
  })
}));

export const performanceGoalsRelations = relations(performanceGoalsTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [performanceGoalsTable.employeeId],
    references: [employeesTable.employeeId]
  })
}));

export const performanceReviewsRelations = relations(performanceReviewsTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [performanceReviewsTable.employeeId],
    references: [employeesTable.employeeId]
  }),
  reviewer: one(employeesTable, {
    fields: [performanceReviewsTable.reviewerId],
    references: [employeesTable.employeeId],
    relationName: 'reviewer'
  })
}));

export const jobVacanciesRelations = relations(jobVacanciesTable, ({ one, many }) => ({
  department: one(departmentsTable, {
    fields: [jobVacanciesTable.departmentId],
    references: [departmentsTable.id]
  }),
  applicants: many(applicantsTable)
}));

export const applicantsRelations = relations(applicantsTable, ({ one }) => ({
  jobVacancy: one(jobVacanciesTable, {
    fields: [applicantsTable.jobVacancyId],
    references: [jobVacanciesTable.id]
  })
}));

// Export all tables and relations for proper query building
export const tables = {
  departments: departmentsTable,
  employees: employeesTable,
  employeeDocuments: employeeDocumentsTable,
  attendance: attendanceTable,
  leaveRequests: leaveRequestsTable,
  leaveBalances: leaveBalancesTable,
  payrollComponents: payrollComponentsTable,
  employeeSalaryStructure: employeeSalaryStructureTable,
  payslips: payslipsTable,
  performanceGoals: performanceGoalsTable,
  performanceReviews: performanceReviewsTable,
  jobVacancies: jobVacanciesTable,
  applicants: applicantsTable
};