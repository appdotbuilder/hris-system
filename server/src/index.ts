import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  createEmployeeInputSchema,
  updateEmployeeInputSchema,
  createEmployeeDocumentInputSchema,
  createDepartmentInputSchema,
  updateDepartmentInputSchema,
  createAttendanceInputSchema,
  updateAttendanceInputSchema,
  createLeaveRequestInputSchema,
  updateLeaveRequestStatusInputSchema,
  createLeaveBalanceInputSchema,
  createPayrollComponentInputSchema,
  createEmployeeSalaryStructureInputSchema,
  createPayslipInputSchema,
  createPerformanceGoalInputSchema,
  updatePerformanceGoalInputSchema,
  createPerformanceReviewInputSchema,
  createJobVacancyInputSchema,
  updateJobVacancyInputSchema,
  createApplicantInputSchema,
  updateApplicantStatusInputSchema,
  idParamSchema,
  employeeIdParamSchema,
  payrollComponentTypeEnum,
  performanceGoalStatusEnum,
  applicantStatusEnum
} from './schema';

// Handler imports - Employee Management
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  getEmployeeByEmployeeId,
  updateEmployee,
  deleteEmployee,
  createEmployeeDocument,
  getEmployeeDocuments,
  deleteEmployeeDocument,
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from './handlers/employee_management';

// Handler imports - Attendance Management
import {
  createAttendance,
  updateAttendance,
  getAttendanceByEmployee,
  getTodayAttendance,
  getAttendanceByDateRange,
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestsByEmployee,
  getPendingLeaveRequests,
  updateLeaveRequestStatus,
  deleteLeaveRequest,
  createLeaveBalance,
  getLeaveBalance,
  updateLeaveBalance
} from './handlers/attendance_management';

// Handler imports - Payroll Management
import {
  createPayrollComponent,
  getPayrollComponents,
  getPayrollComponentById,
  updatePayrollComponent,
  deletePayrollComponent,
  createEmployeeSalaryStructure,
  getEmployeeSalaryStructure,
  updateEmployeeSalaryStructure,
  deleteEmployeeSalaryStructure,
  createPayslip,
  generatePayslip,
  getPayslips,
  getPayslipsByEmployee,
  getPayslipById,
  generateMonthlyPayslips
} from './handlers/payroll_management';

// Handler imports - Performance Management
import {
  createPerformanceGoal,
  getPerformanceGoals,
  getPerformanceGoalsByEmployee,
  getPerformanceGoalById,
  updatePerformanceGoal,
  deletePerformanceGoal,
  getOverdueGoals,
  getGoalsByStatus,
  createPerformanceReview,
  getPerformanceReviews,
  getPerformanceReviewsByEmployee,
  getPerformanceReviewsByReviewer,
  getPerformanceReviewById,
  updatePerformanceReview,
  deletePerformanceReview,
  getAverageRatingByEmployee
} from './handlers/performance_management';

// Handler imports - Recruitment Management
import {
  createJobVacancy,
  getJobVacancies,
  getOpenJobVacancies,
  getJobVacancyById,
  updateJobVacancy,
  deleteJobVacancy,
  closeJobVacancy,
  getJobVacanciesByDepartment,
  createApplicant,
  getApplicants,
  getApplicantsByJobVacancy,
  getApplicantById,
  updateApplicantStatus,
  deleteApplicant,
  getApplicantsByStatus,
  searchApplicants,
  getRecruitmentStatistics
} from './handlers/recruitment_management';

// Handler imports - Dashboard
import {
  getDashboardOverview,
  getEmployeeDashboard,
  getManagerDashboard,
  getAttendanceStatistics,
  getPayrollStatistics,
  getHRMetrics
} from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Employee Management Routes
  employees: router({
    create: publicProcedure
      .input(createEmployeeInputSchema)
      .mutation(({ input }) => createEmployee(input)),
    
    getAll: publicProcedure
      .query(() => getEmployees()),
    
    getById: publicProcedure
      .input(idParamSchema)
      .query(({ input }) => getEmployeeById(input)),
    
    getByEmployeeId: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getEmployeeByEmployeeId(input)),
    
    update: publicProcedure
      .input(updateEmployeeInputSchema)
      .mutation(({ input }) => updateEmployee(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deleteEmployee(input)),
  }),

  // Employee Documents Routes
  employeeDocuments: router({
    create: publicProcedure
      .input(createEmployeeDocumentInputSchema)
      .mutation(({ input }) => createEmployeeDocument(input)),
    
    getByEmployee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getEmployeeDocuments(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deleteEmployeeDocument(input)),
  }),

  // Department Routes
  departments: router({
    create: publicProcedure
      .input(createDepartmentInputSchema)
      .mutation(({ input }) => createDepartment(input)),
    
    getAll: publicProcedure
      .query(() => getDepartments()),
    
    getById: publicProcedure
      .input(idParamSchema)
      .query(({ input }) => getDepartmentById(input)),
    
    update: publicProcedure
      .input(updateDepartmentInputSchema)
      .mutation(({ input }) => updateDepartment(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deleteDepartment(input)),
  }),

  // Attendance Routes
  attendance: router({
    create: publicProcedure
      .input(createAttendanceInputSchema)
      .mutation(({ input }) => createAttendance(input)),
    
    update: publicProcedure
      .input(updateAttendanceInputSchema)
      .mutation(({ input }) => updateAttendance(input)),
    
    getByEmployee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getAttendanceByEmployee(input)),
    
    getToday: publicProcedure
      .query(() => getTodayAttendance()),
    
    getByDateRange: publicProcedure
      .input(z.object({ 
        employeeId: z.string(), 
        startDate: z.coerce.date(), 
        endDate: z.coerce.date() 
      }))
      .query(({ input }) => getAttendanceByDateRange(input)),
  }),

  // Leave Management Routes
  leaveRequests: router({
    create: publicProcedure
      .input(createLeaveRequestInputSchema)
      .mutation(({ input }) => createLeaveRequest(input)),
    
    getAll: publicProcedure
      .query(() => getLeaveRequests()),
    
    getByEmployee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getLeaveRequestsByEmployee(input)),
    
    getPending: publicProcedure
      .query(() => getPendingLeaveRequests()),
    
    updateStatus: publicProcedure
      .input(updateLeaveRequestStatusInputSchema)
      .mutation(({ input }) => updateLeaveRequestStatus(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deleteLeaveRequest(input)),
  }),

  // Leave Balance Routes
  leaveBalance: router({
    create: publicProcedure
      .input(createLeaveBalanceInputSchema)
      .mutation(({ input }) => createLeaveBalance(input)),
    
    getByEmployee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getLeaveBalance(input)),
    
    update: publicProcedure
      .input(z.object({ 
        employeeId: z.string(), 
        leaveType: z.string(), 
        days: z.number() 
      }))
      .mutation(({ input }) => updateLeaveBalance(input)),
  }),

  // Payroll Component Routes
  payrollComponents: router({
    create: publicProcedure
      .input(createPayrollComponentInputSchema)
      .mutation(({ input }) => createPayrollComponent(input)),
    
    getAll: publicProcedure
      .query(() => getPayrollComponents()),
    
    getById: publicProcedure
      .input(idParamSchema)
      .query(({ input }) => getPayrollComponentById(input)),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        type: payrollComponentTypeEnum.optional(),
        amount: z.number().optional()
      }))
      .mutation(({ input }) => updatePayrollComponent(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deletePayrollComponent(input)),
  }),

  // Employee Salary Structure Routes
  employeeSalaryStructure: router({
    create: publicProcedure
      .input(createEmployeeSalaryStructureInputSchema)
      .mutation(({ input }) => createEmployeeSalaryStructure(input)),
    
    getByEmployee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getEmployeeSalaryStructure(input)),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        amount: z.number()
      }))
      .mutation(({ input }) => updateEmployeeSalaryStructure(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deleteEmployeeSalaryStructure(input)),
  }),

  // Payslip Routes
  payslips: router({
    create: publicProcedure
      .input(createPayslipInputSchema)
      .mutation(({ input }) => createPayslip(input)),
    
    generate: publicProcedure
      .input(z.object({
        employeeId: z.string(),
        payPeriodStart: z.coerce.date(),
        payPeriodEnd: z.coerce.date()
      }))
      .mutation(({ input }) => generatePayslip(input)),
    
    getAll: publicProcedure
      .query(() => getPayslips()),
    
    getByEmployee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getPayslipsByEmployee(input)),
    
    getById: publicProcedure
      .input(idParamSchema)
      .query(({ input }) => getPayslipById(input)),
    
    generateMonthly: publicProcedure
      .input(z.object({
        year: z.number(),
        month: z.number()
      }))
      .mutation(({ input }) => generateMonthlyPayslips(input)),
  }),

  // Performance Goal Routes
  performanceGoals: router({
    create: publicProcedure
      .input(createPerformanceGoalInputSchema)
      .mutation(({ input }) => createPerformanceGoal(input)),
    
    getAll: publicProcedure
      .query(() => getPerformanceGoals()),
    
    getByEmployee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getPerformanceGoalsByEmployee(input)),
    
    getById: publicProcedure
      .input(idParamSchema)
      .query(({ input }) => getPerformanceGoalById(input)),
    
    update: publicProcedure
      .input(updatePerformanceGoalInputSchema)
      .mutation(({ input }) => updatePerformanceGoal(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deletePerformanceGoal(input)),
    
    getOverdue: publicProcedure
      .query(() => getOverdueGoals()),
    
    getByStatus: publicProcedure
      .input(z.object({ 
        status: performanceGoalStatusEnum
      }))
      .query(({ input }) => getGoalsByStatus(input)),
  }),

  // Performance Review Routes
  performanceReviews: router({
    create: publicProcedure
      .input(createPerformanceReviewInputSchema)
      .mutation(({ input }) => createPerformanceReview(input)),
    
    getAll: publicProcedure
      .query(() => getPerformanceReviews()),
    
    getByEmployee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getPerformanceReviewsByEmployee(input)),
    
    getByReviewer: publicProcedure
      .input(z.object({ reviewerId: z.string() }))
      .query(({ input }) => getPerformanceReviewsByReviewer(input)),
    
    getById: publicProcedure
      .input(idParamSchema)
      .query(({ input }) => getPerformanceReviewById(input)),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        reviewDate: z.coerce.date().optional(),
        overallRating: z.number().optional(),
        comments: z.string().nullable().optional()
      }))
      .mutation(({ input }) => updatePerformanceReview(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deletePerformanceReview(input)),
    
    getAverageRating: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getAverageRatingByEmployee(input)),
  }),

  // Job Vacancy Routes
  jobVacancies: router({
    create: publicProcedure
      .input(createJobVacancyInputSchema)
      .mutation(({ input }) => createJobVacancy(input)),
    
    getAll: publicProcedure
      .query(() => getJobVacancies()),
    
    getOpen: publicProcedure
      .query(() => getOpenJobVacancies()),
    
    getById: publicProcedure
      .input(idParamSchema)
      .query(({ input }) => getJobVacancyById(input)),
    
    update: publicProcedure
      .input(updateJobVacancyInputSchema)
      .mutation(({ input }) => updateJobVacancy(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deleteJobVacancy(input)),
    
    close: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => closeJobVacancy(input)),
    
    getByDepartment: publicProcedure
      .input(z.object({ departmentId: z.number() }))
      .query(({ input }) => getJobVacanciesByDepartment(input)),
  }),

  // Applicant Routes
  applicants: router({
    create: publicProcedure
      .input(createApplicantInputSchema)
      .mutation(({ input }) => createApplicant(input)),
    
    getAll: publicProcedure
      .query(() => getApplicants()),
    
    getByJobVacancy: publicProcedure
      .input(z.object({ jobVacancyId: z.number() }))
      .query(({ input }) => getApplicantsByJobVacancy(input)),
    
    getById: publicProcedure
      .input(idParamSchema)
      .query(({ input }) => getApplicantById(input)),
    
    updateStatus: publicProcedure
      .input(updateApplicantStatusInputSchema)
      .mutation(({ input }) => updateApplicantStatus(input)),
    
    delete: publicProcedure
      .input(idParamSchema)
      .mutation(({ input }) => deleteApplicant(input)),
    
    getByStatus: publicProcedure
      .input(z.object({ 
        status: applicantStatusEnum
      }))
      .query(({ input }) => getApplicantsByStatus(input)),
    
    search: publicProcedure
      .input(z.object({ searchTerm: z.string() }))
      .query(({ input }) => searchApplicants(input)),
  }),

  // Recruitment Statistics
  recruitmentStats: publicProcedure
    .query(() => getRecruitmentStatistics()),

  // Dashboard Routes
  dashboard: router({
    overview: publicProcedure
      .query(() => getDashboardOverview()),
    
    employee: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getEmployeeDashboard(input)),
    
    manager: publicProcedure
      .input(employeeIdParamSchema)
      .query(({ input }) => getManagerDashboard(input)),
    
    attendanceStats: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date()
      }))
      .query(({ input }) => getAttendanceStatistics(input)),
    
    payrollStats: publicProcedure
      .input(z.object({
        year: z.number(),
        month: z.number()
      }))
      .query(({ input }) => getPayrollStatistics(input)),
    
    hrMetrics: publicProcedure
      .query(() => getHRMetrics()),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`HRIS TRPC server listening at port: ${port}`);
  console.log('Available modules:');
  console.log('  - Employee Management (employees, departments, documents)');
  console.log('  - Attendance Management (attendance, leave requests, leave balance)');
  console.log('  - Payroll Management (components, salary structure, payslips)');
  console.log('  - Performance Management (goals, reviews)');
  console.log('  - Recruitment Management (job vacancies, applicants)');
  console.log('  - Dashboard & Analytics');
}

start();