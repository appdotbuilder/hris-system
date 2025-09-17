import { z } from 'zod';

// Enums
export const genderEnum = z.enum(['Male', 'Female', 'Other']);
export const maritalStatusEnum = z.enum(['Single', 'Married', 'Divorced', 'Widowed']);
export const employmentStatusEnum = z.enum(['Active', 'On Leave', 'Terminated']);
export const userRoleEnum = z.enum(['Admin', 'Manager', 'Employee']);
export const leaveTypeEnum = z.enum(['Annual Leave', 'Sick Leave', 'Personal Leave', 'Maternity Leave', 'Paternity Leave']);
export const leaveStatusEnum = z.enum(['Pending', 'Approved', 'Rejected']);
export const payrollComponentTypeEnum = z.enum(['Allowance', 'Deduction']);
export const performanceGoalStatusEnum = z.enum(['Not Started', 'In Progress', 'Completed', 'Canceled']);
export const jobVacancyStatusEnum = z.enum(['Open', 'Closed']);
export const applicantStatusEnum = z.enum(['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']);

// Department Schema
export const departmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Department = z.infer<typeof departmentSchema>;

export const createDepartmentInputSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  description: z.string().nullable().optional()
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentInputSchema>;

export const updateDepartmentInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Department name is required').optional(),
  description: z.string().nullable().optional()
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentInputSchema>;

// Employee Schema
export const employeeSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  employeeId: z.string(),
  dateOfBirth: z.coerce.date(),
  gender: genderEnum,
  maritalStatus: maritalStatusEnum,
  address: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  email: z.string(),
  position: z.string().nullable(),
  department: z.string().nullable(),
  managerId: z.string().nullable(),
  startDate: z.coerce.date(),
  employmentStatus: employmentStatusEnum,
  bankName: z.string().nullable(),
  bankAccountNumber: z.string().nullable(),
  role: userRoleEnum,
  created_at: z.coerce.date()
});

export type Employee = z.infer<typeof employeeSchema>;

export const createEmployeeInputSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  dateOfBirth: z.coerce.date(),
  gender: genderEnum,
  maritalStatus: maritalStatusEnum,
  address: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  email: z.string().email('Invalid email format'),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  startDate: z.coerce.date(),
  employmentStatus: employmentStatusEnum.default('Active'),
  bankName: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  role: userRoleEnum.default('Employee')
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

export const updateEmployeeInputSchema = z.object({
  id: z.number(),
  fullName: z.string().min(1, 'Full name is required').optional(),
  employeeId: z.string().min(1, 'Employee ID is required').optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: genderEnum.optional(),
  maritalStatus: maritalStatusEnum.optional(),
  address: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  email: z.string().email('Invalid email format').optional(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  startDate: z.coerce.date().optional(),
  employmentStatus: employmentStatusEnum.optional(),
  bankName: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  role: userRoleEnum.optional()
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;

// Employee Document Schema
export const employeeDocumentSchema = z.object({
  id: z.number(),
  employeeId: z.string(),
  documentName: z.string(),
  documentType: z.string(),
  fileUrl: z.string(),
  created_at: z.coerce.date()
});

export type EmployeeDocument = z.infer<typeof employeeDocumentSchema>;

export const createEmployeeDocumentInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  documentName: z.string().min(1, 'Document name is required'),
  documentType: z.string().min(1, 'Document type is required'),
  fileUrl: z.string().url('Invalid file URL')
});

export type CreateEmployeeDocumentInput = z.infer<typeof createEmployeeDocumentInputSchema>;

// Attendance Schema
export const attendanceSchema = z.object({
  id: z.number(),
  employeeId: z.string(),
  checkInTime: z.coerce.date(),
  checkOutTime: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Attendance = z.infer<typeof attendanceSchema>;

export const createAttendanceInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  checkInTime: z.coerce.date(),
  checkOutTime: z.coerce.date().nullable().optional()
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceInputSchema>;

export const updateAttendanceInputSchema = z.object({
  id: z.number(),
  checkOutTime: z.coerce.date()
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInputSchema>;

// Leave Request Schema
export const leaveRequestSchema = z.object({
  id: z.number(),
  employeeId: z.string(),
  leaveType: leaveTypeEnum,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string(),
  status: leaveStatusEnum,
  created_at: z.coerce.date()
});

export type LeaveRequest = z.infer<typeof leaveRequestSchema>;

export const createLeaveRequestInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  leaveType: leaveTypeEnum,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().min(1, 'Reason is required')
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestInputSchema>;

export const updateLeaveRequestStatusInputSchema = z.object({
  id: z.number(),
  status: leaveStatusEnum
});

export type UpdateLeaveRequestStatusInput = z.infer<typeof updateLeaveRequestStatusInputSchema>;

// Leave Balance Schema
export const leaveBalanceSchema = z.object({
  id: z.number(),
  employeeId: z.string(),
  annualLeaveBalance: z.number(),
  sickLeaveBalance: z.number(),
  personalLeaveBalance: z.number(),
  created_at: z.coerce.date()
});

export type LeaveBalance = z.infer<typeof leaveBalanceSchema>;

export const createLeaveBalanceInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  annualLeaveBalance: z.number().nonnegative(),
  sickLeaveBalance: z.number().nonnegative(),
  personalLeaveBalance: z.number().nonnegative()
});

export type CreateLeaveBalanceInput = z.infer<typeof createLeaveBalanceInputSchema>;

// Payroll Component Schema
export const payrollComponentSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: payrollComponentTypeEnum,
  amount: z.number(),
  created_at: z.coerce.date()
});

export type PayrollComponent = z.infer<typeof payrollComponentSchema>;

export const createPayrollComponentInputSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  type: payrollComponentTypeEnum,
  amount: z.number()
});

export type CreatePayrollComponentInput = z.infer<typeof createPayrollComponentInputSchema>;

// Employee Salary Structure Schema
export const employeeSalaryStructureSchema = z.object({
  id: z.number(),
  employeeId: z.string(),
  componentId: z.number(),
  amount: z.number(),
  created_at: z.coerce.date()
});

export type EmployeeSalaryStructure = z.infer<typeof employeeSalaryStructureSchema>;

export const createEmployeeSalaryStructureInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  componentId: z.number(),
  amount: z.number()
});

export type CreateEmployeeSalaryStructureInput = z.infer<typeof createEmployeeSalaryStructureInputSchema>;

// Payslip Schema
export const payslipSchema = z.object({
  id: z.number(),
  employeeId: z.string(),
  payPeriodStart: z.coerce.date(),
  payPeriodEnd: z.coerce.date(),
  grossSalary: z.number(),
  totalAllowances: z.number(),
  totalDeductions: z.number(),
  netSalary: z.number(),
  created_at: z.coerce.date()
});

export type Payslip = z.infer<typeof payslipSchema>;

export const createPayslipInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  payPeriodStart: z.coerce.date(),
  payPeriodEnd: z.coerce.date(),
  grossSalary: z.number(),
  totalAllowances: z.number(),
  totalDeductions: z.number(),
  netSalary: z.number()
});

export type CreatePayslipInput = z.infer<typeof createPayslipInputSchema>;

// Performance Goal Schema
export const performanceGoalSchema = z.object({
  id: z.number(),
  employeeId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.coerce.date().nullable(),
  status: performanceGoalStatusEnum,
  created_at: z.coerce.date()
});

export type PerformanceGoal = z.infer<typeof performanceGoalSchema>;

export const createPerformanceGoalInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  status: performanceGoalStatusEnum.default('Not Started')
});

export type CreatePerformanceGoalInput = z.infer<typeof createPerformanceGoalInputSchema>;

export const updatePerformanceGoalInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  status: performanceGoalStatusEnum.optional()
});

export type UpdatePerformanceGoalInput = z.infer<typeof updatePerformanceGoalInputSchema>;

// Performance Review Schema
export const performanceReviewSchema = z.object({
  id: z.number(),
  employeeId: z.string(),
  reviewerId: z.string(),
  reviewDate: z.coerce.date(),
  overallRating: z.number(),
  comments: z.string().nullable(),
  created_at: z.coerce.date()
});

export type PerformanceReview = z.infer<typeof performanceReviewSchema>;

export const createPerformanceReviewInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  reviewerId: z.string().min(1, 'Reviewer ID is required'),
  reviewDate: z.coerce.date(),
  overallRating: z.number().min(1).max(5),
  comments: z.string().nullable().optional()
});

export type CreatePerformanceReviewInput = z.infer<typeof createPerformanceReviewInputSchema>;

// Job Vacancy Schema
export const jobVacancySchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  departmentId: z.number().nullable(),
  status: jobVacancyStatusEnum,
  postedDate: z.coerce.date(),
  created_at: z.coerce.date()
});

export type JobVacancy = z.infer<typeof jobVacancySchema>;

export const createJobVacancyInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  departmentId: z.number().nullable().optional(),
  status: jobVacancyStatusEnum.default('Open'),
  postedDate: z.coerce.date()
});

export type CreateJobVacancyInput = z.infer<typeof createJobVacancyInputSchema>;

export const updateJobVacancyInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  departmentId: z.number().nullable().optional(),
  status: jobVacancyStatusEnum.optional(),
  postedDate: z.coerce.date().optional()
});

export type UpdateJobVacancyInput = z.infer<typeof updateJobVacancyInputSchema>;

// Applicant Schema
export const applicantSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  email: z.string(),
  phoneNumber: z.string().nullable(),
  resumeUrl: z.string().nullable(),
  jobVacancyId: z.number(),
  applicationDate: z.coerce.date(),
  status: applicantStatusEnum,
  created_at: z.coerce.date()
});

export type Applicant = z.infer<typeof applicantSchema>;

export const createApplicantInputSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email format'),
  phoneNumber: z.string().nullable().optional(),
  resumeUrl: z.string().url('Invalid resume URL').nullable().optional(),
  jobVacancyId: z.number(),
  applicationDate: z.coerce.date(),
  status: applicantStatusEnum.default('Applied')
});

export type CreateApplicantInput = z.infer<typeof createApplicantInputSchema>;

export const updateApplicantStatusInputSchema = z.object({
  id: z.number(),
  status: applicantStatusEnum
});

export type UpdateApplicantStatusInput = z.infer<typeof updateApplicantStatusInputSchema>;

// Common query schemas
export const idParamSchema = z.object({
  id: z.number()
});

export type IdParam = z.infer<typeof idParamSchema>;

export const employeeIdParamSchema = z.object({
  employeeId: z.string()
});

export type EmployeeIdParam = z.infer<typeof employeeIdParamSchema>;