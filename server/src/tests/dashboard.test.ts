import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  employeesTable, 
  departmentsTable, 
  leaveRequestsTable,
  leaveBalancesTable,
  attendanceTable,
  jobVacanciesTable,
  applicantsTable,
  performanceGoalsTable,
  performanceReviewsTable,
  payslipsTable
} from '../db/schema';
import { 
  getDashboardOverview,
  getEmployeeDashboard,
  getManagerDashboard,
  getAttendanceStatistics,
  getPayrollStatistics,
  getHRMetrics
} from '../handlers/dashboard';

describe('Dashboard Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create departments
    const [department] = await db.insert(departmentsTable)
      .values({
        name: 'Engineering',
        description: 'Software Engineering Department'
      })
      .returning()
      .execute();

    // Create employees
    const [manager] = await db.insert(employeesTable)
      .values({
        fullName: 'John Manager',
        employeeId: 'EMP001',
        dateOfBirth: '1980-01-01',
        gender: 'Male',
        maritalStatus: 'Married',
        email: 'john.manager@company.com',
        position: 'Engineering Manager',
        department: 'Engineering',
        startDate: '2020-01-01',
        employmentStatus: 'Active',
        role: 'Manager'
      })
      .returning()
      .execute();

    const [employee1] = await db.insert(employeesTable)
      .values({
        fullName: 'Alice Developer',
        employeeId: 'EMP002',
        dateOfBirth: '1990-05-15',
        gender: 'Female',
        maritalStatus: 'Single',
        email: 'alice.developer@company.com',
        position: 'Senior Developer',
        department: 'Engineering',
        managerId: 'EMP001',
        startDate: '2021-03-01',
        employmentStatus: 'Active',
        role: 'Employee'
      })
      .returning()
      .execute();

    const [employee2] = await db.insert(employeesTable)
      .values({
        fullName: 'Bob Tester',
        employeeId: 'EMP003',
        dateOfBirth: '1985-12-10',
        gender: 'Male',
        maritalStatus: 'Single',
        email: 'bob.tester@company.com',
        position: 'QA Engineer',
        department: 'Engineering',
        managerId: 'EMP001',
        startDate: '2022-01-15',
        employmentStatus: 'On Leave',
        role: 'Employee'
      })
      .returning()
      .execute();

    // Create leave balances
    await db.insert(leaveBalancesTable)
      .values([
        {
          employeeId: 'EMP002',
          annualLeaveBalance: 20,
          sickLeaveBalance: 10,
          personalLeaveBalance: 5
        },
        {
          employeeId: 'EMP003',
          annualLeaveBalance: 15,
          sickLeaveBalance: 8,
          personalLeaveBalance: 3
        }
      ])
      .execute();

    // Create leave requests
    await db.insert(leaveRequestsTable)
      .values([
        {
          employeeId: 'EMP002',
          leaveType: 'Annual Leave',
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          reason: 'Vacation',
          status: 'Pending'
        },
        {
          employeeId: 'EMP003',
          leaveType: 'Sick Leave',
          startDate: '2024-01-15',
          endDate: '2024-01-20',
          reason: 'Medical',
          status: 'Approved'
        }
      ])
      .execute();

    // Create attendance records
    const todayAttendance = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(attendanceTable)
      .values([
        {
          employeeId: 'EMP001',
          checkInTime: new Date(todayAttendance.setHours(9, 0, 0, 0)),
          checkOutTime: new Date(todayAttendance.setHours(18, 0, 0, 0))
        },
        {
          employeeId: 'EMP002',
          checkInTime: new Date(yesterday.setHours(8, 30, 0, 0)),
          checkOutTime: new Date(yesterday.setHours(17, 30, 0, 0))
        }
      ])
      .execute();

    // Create job vacancies
    const todayStr = new Date().toISOString().split('T')[0];
    const [jobVacancy] = await db.insert(jobVacanciesTable)
      .values({
        title: 'Software Engineer',
        description: 'Looking for a skilled software engineer',
        departmentId: department.id,
        status: 'Open',
        postedDate: todayStr
      })
      .returning()
      .execute();

    // Create applicants
    await db.insert(applicantsTable)
      .values([
        {
          fullName: 'Jane Applicant',
          email: 'jane@example.com',
          phoneNumber: '123-456-7890',
          jobVacancyId: jobVacancy.id,
          applicationDate: todayStr,
          status: 'Applied'
        },
        {
          fullName: 'Mike Candidate',
          email: 'mike@example.com',
          jobVacancyId: jobVacancy.id,
          applicationDate: todayStr,
          status: 'Interview'
        }
      ])
      .execute();

    // Create performance goals
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 10);

    await db.insert(performanceGoalsTable)
      .values([
        {
          employeeId: 'EMP002',
          title: 'Complete Project Alpha',
          description: 'Finish the alpha project by deadline',
          dueDate: pastDueDate.toISOString().split('T')[0],
          status: 'In Progress'
        },
        {
          employeeId: 'EMP002',
          title: 'Learn New Framework',
          status: 'Completed'
        },
        {
          employeeId: 'EMP003',
          title: 'Improve Testing Coverage',
          status: 'In Progress'
        }
      ])
      .execute();

    // Create performance reviews
    await db.insert(performanceReviewsTable)
      .values([
        {
          employeeId: 'EMP002',
          reviewerId: 'EMP001',
          reviewDate: '2023-12-01',
          overallRating: 4,
          comments: 'Excellent performance'
        },
        {
          employeeId: 'EMP003',
          reviewerId: 'EMP001',
          reviewDate: '2023-12-15',
          overallRating: 3,
          comments: 'Good work, room for improvement'
        }
      ])
      .execute();

    // Create payslips
    await db.insert(payslipsTable)
      .values([
        {
          employeeId: 'EMP002',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
          grossSalary: '5000.00',
          totalAllowances: '500.00',
          totalDeductions: '800.00',
          netSalary: '4700.00'
        },
        {
          employeeId: 'EMP003',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
          grossSalary: '4500.00',
          totalAllowances: '300.00',
          totalDeductions: '700.00',
          netSalary: '4100.00'
        }
      ])
      .execute();

    return { department, manager, employee1, employee2, jobVacancy };
  };

  describe('getDashboardOverview', () => {
    it('should return comprehensive dashboard statistics', async () => {
      await createTestData();

      const result = await getDashboardOverview();

      expect(result.totalEmployees).toEqual(3);
      expect(result.activeEmployees).toEqual(2);
      expect(result.employeesOnLeave).toEqual(1);
      expect(result.totalDepartments).toEqual(1);
      expect(result.pendingLeaveRequests).toEqual(1);
      expect(result.todayAttendance).toBeGreaterThanOrEqual(0);
      expect(result.openVacancies).toEqual(1);
      expect(result.totalApplicants).toEqual(2);
      expect(result.overdueGoals).toEqual(1);
      expect(result.averageRating).toEqual(3.5);
    });

    it('should return zeros when no data exists', async () => {
      const result = await getDashboardOverview();

      expect(result.totalEmployees).toEqual(0);
      expect(result.activeEmployees).toEqual(0);
      expect(result.employeesOnLeave).toEqual(0);
      expect(result.totalDepartments).toEqual(0);
      expect(result.pendingLeaveRequests).toEqual(0);
      expect(result.todayAttendance).toEqual(0);
      expect(result.openVacancies).toEqual(0);
      expect(result.totalApplicants).toEqual(0);
      expect(result.overdueGoals).toEqual(0);
      expect(result.averageRating).toEqual(0);
    });
  });

  describe('getEmployeeDashboard', () => {
    it('should return employee-specific dashboard data', async () => {
      await createTestData();

      const result = await getEmployeeDashboard({ employeeId: 'EMP002' });

      expect(result.employee.fullName).toEqual('Alice Developer');
      expect(result.employee.position).toEqual('Senior Developer');
      expect(result.employee.department).toEqual('Engineering');
      expect(result.employee.employmentStatus).toEqual('Active');

      expect(result.leaveBalance.annualLeaveBalance).toEqual(20);
      expect(result.leaveBalance.sickLeaveBalance).toEqual(10);
      expect(result.leaveBalance.personalLeaveBalance).toEqual(5);

      expect(result.pendingLeaveRequests).toEqual(1);
      expect(result.activeGoals).toEqual(1);
      expect(result.completedGoals).toEqual(1);

      expect(result.lastPayslip).not.toBeNull();
      expect(result.lastPayslip?.netSalary).toEqual(4700);

      expect(Array.isArray(result.recentAttendance)).toBe(true);
    });

    it('should handle employee not found', async () => {
      await expect(getEmployeeDashboard({ employeeId: 'NONEXISTENT' }))
        .rejects.toThrow('Employee not found');
    });

    it('should handle employee with no leave balance', async () => {
      await db.insert(employeesTable)
        .values({
          fullName: 'New Employee',
          employeeId: 'EMP999',
          dateOfBirth: '1992-01-01',
          gender: 'Male',
          maritalStatus: 'Single',
          email: 'new@company.com',
          startDate: new Date().toISOString().split('T')[0],
          employmentStatus: 'Active',
          role: 'Employee'
        })
        .execute();

      const result = await getEmployeeDashboard({ employeeId: 'EMP999' });

      expect(result.leaveBalance.annualLeaveBalance).toEqual(0);
      expect(result.leaveBalance.sickLeaveBalance).toEqual(0);
      expect(result.leaveBalance.personalLeaveBalance).toEqual(0);
      expect(result.lastPayslip).toBeNull();
    });
  });

  describe('getManagerDashboard', () => {
    it('should return manager-specific dashboard data', async () => {
      await createTestData();

      const result = await getManagerDashboard({ employeeId: 'EMP001' });

      expect(result.teamSize).toEqual(2);
      expect(result.pendingLeaveApprovals).toEqual(1);
      expect(result.teamGoalsOverdue).toEqual(1);
      expect(result.teamPerformanceAverage).toEqual(3.5);

      expect(result.directReports).toHaveLength(2);
      expect(result.directReports[0].employeeId).toEqual('EMP002');
      expect(result.directReports[0].fullName).toEqual('Alice Developer');
      expect(result.directReports[1].employeeId).toEqual('EMP003');
      expect(result.directReports[1].fullName).toEqual('Bob Tester');
    });

    it('should handle manager with no direct reports', async () => {
      await db.insert(employeesTable)
        .values({
          fullName: 'Solo Manager',
          employeeId: 'MGR001',
          dateOfBirth: '1980-01-01',
          gender: 'Male',
          maritalStatus: 'Single',
          email: 'solo@company.com',
          startDate: new Date().toISOString().split('T')[0],
          employmentStatus: 'Active',
          role: 'Manager'
        })
        .execute();

      const result = await getManagerDashboard({ employeeId: 'MGR001' });

      expect(result.teamSize).toEqual(0);
      expect(result.teamAttendanceToday).toEqual(0);
      expect(result.pendingLeaveApprovals).toEqual(0);
      expect(result.teamGoalsOverdue).toEqual(0);
      expect(result.teamPerformanceAverage).toEqual(0);
      expect(result.directReports).toHaveLength(0);
    });
  });

  describe('getAttendanceStatistics', () => {
    it('should return attendance statistics for date range', async () => {
      await createTestData();

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await getAttendanceStatistics({ startDate, endDate });

      expect(result.totalWorkingDays).toBeGreaterThan(0);
      expect(result.averageAttendanceRate).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.departmentAttendance)).toBe(true);
      expect(Array.isArray(result.dailyAttendance)).toBe(true);

      if (result.departmentAttendance.length > 0) {
        expect(result.departmentAttendance[0]).toHaveProperty('department');
        expect(result.departmentAttendance[0]).toHaveProperty('attendanceRate');
        expect(typeof result.departmentAttendance[0].attendanceRate).toBe('number');
      }

      if (result.dailyAttendance.length > 0) {
        expect(result.dailyAttendance[0]).toHaveProperty('date');
        expect(result.dailyAttendance[0]).toHaveProperty('present');
        expect(result.dailyAttendance[0]).toHaveProperty('absent');
        expect(result.dailyAttendance[0]).toHaveProperty('lateArrivals');
      }
    });

    it('should handle empty date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await getAttendanceStatistics({ startDate, endDate });

      expect(result.totalWorkingDays).toBeGreaterThan(0);
      expect(result.averageAttendanceRate).toEqual(0);
      expect(result.departmentAttendance).toHaveLength(0);
    });
  });

  describe('getPayrollStatistics', () => {
    it('should return payroll statistics for specific month/year', async () => {
      await createTestData();

      const result = await getPayrollStatistics({ year: 2024, month: 1 });

      expect(result.totalGrossPay).toEqual(9500);
      expect(result.totalNetPay).toEqual(8800);
      expect(result.totalAllowances).toEqual(800);
      expect(result.totalDeductions).toEqual(1500);
      expect(result.averageSalary).toEqual(4400);

      expect(Array.isArray(result.payrollByDepartment)).toBe(true);
      if (result.payrollByDepartment.length > 0) {
        expect(result.payrollByDepartment[0]).toHaveProperty('department');
        expect(result.payrollByDepartment[0]).toHaveProperty('totalGrossPay');
        expect(result.payrollByDepartment[0]).toHaveProperty('totalNetPay');
        expect(result.payrollByDepartment[0]).toHaveProperty('employeeCount');
      }
    });

    it('should handle month with no payslips', async () => {
      const result = await getPayrollStatistics({ year: 2025, month: 6 });

      expect(result.totalGrossPay).toEqual(0);
      expect(result.totalNetPay).toEqual(0);
      expect(result.totalAllowances).toEqual(0);
      expect(result.totalDeductions).toEqual(0);
      expect(result.averageSalary).toEqual(0);
      expect(result.payrollByDepartment).toHaveLength(0);
    });
  });

  describe('getHRMetrics', () => {
    it('should return comprehensive HR metrics', async () => {
      await createTestData();

      const result = await getHRMetrics();

      expect(typeof result.employeeTurnoverRate).toBe('number');
      expect(typeof result.averageEmployeeTenure).toBe('number');
      expect(typeof result.newHiresThisMonth).toBe('number');
      expect(typeof result.terminationsThisMonth).toBe('number');

      expect(result.genderDistribution).toHaveProperty('male');
      expect(result.genderDistribution).toHaveProperty('female');
      expect(result.genderDistribution).toHaveProperty('other');
      expect(result.genderDistribution.male).toEqual(2);
      expect(result.genderDistribution.female).toEqual(1);
      expect(result.genderDistribution.other).toEqual(0);

      expect(Array.isArray(result.ageDistribution)).toBe(true);
      expect(Array.isArray(result.departmentDistribution)).toBe(true);

      if (result.ageDistribution.length > 0) {
        expect(result.ageDistribution[0]).toHaveProperty('ageGroup');
        expect(result.ageDistribution[0]).toHaveProperty('count');
      }

      if (result.departmentDistribution.length > 0) {
        expect(result.departmentDistribution[0]).toHaveProperty('department');
        expect(result.departmentDistribution[0]).toHaveProperty('count');
        expect(result.departmentDistribution[0].department).toEqual('Engineering');
        expect(result.departmentDistribution[0].count).toEqual(3);
      }
    });

    it('should handle empty employee database', async () => {
      const result = await getHRMetrics();

      expect(result.employeeTurnoverRate).toEqual(0);
      expect(result.averageEmployeeTenure).toEqual(0);
      expect(result.newHiresThisMonth).toEqual(0);
      expect(result.terminationsThisMonth).toEqual(0);

      expect(result.genderDistribution.male).toEqual(0);
      expect(result.genderDistribution.female).toEqual(0);
      expect(result.genderDistribution.other).toEqual(0);

      expect(result.ageDistribution).toHaveLength(5);
      expect(result.departmentDistribution).toHaveLength(0);
    });

    it('should calculate age distribution correctly', async () => {
      // Create employees with specific ages for testing
      const today = new Date();
      const birthDate22 = new Date(today.getFullYear() - 22, today.getMonth(), today.getDate());
      const birthDate30 = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
      const birthDate40 = new Date(today.getFullYear() - 40, today.getMonth(), today.getDate());

      await db.insert(employeesTable)
        .values([
          {
            fullName: 'Young Employee',
            employeeId: 'YOUNG001',
            dateOfBirth: birthDate22.toISOString().split('T')[0],
            gender: 'Male',
            maritalStatus: 'Single',
            email: 'young@company.com',
            startDate: new Date().toISOString().split('T')[0],
            employmentStatus: 'Active',
            role: 'Employee'
          },
          {
            fullName: 'Mid Employee',
            employeeId: 'MID001',
            dateOfBirth: birthDate30.toISOString().split('T')[0],
            gender: 'Female',
            maritalStatus: 'Married',
            email: 'mid@company.com',
            startDate: new Date().toISOString().split('T')[0],
            employmentStatus: 'Active',
            role: 'Employee'
          },
          {
            fullName: 'Senior Employee',
            employeeId: 'SENIOR001',
            dateOfBirth: birthDate40.toISOString().split('T')[0],
            gender: 'Male',
            maritalStatus: 'Married',
            email: 'senior@company.com',
            startDate: new Date().toISOString().split('T')[0],
            employmentStatus: 'Active',
            role: 'Employee'
          }
        ])
        .execute();

      const result = await getHRMetrics();

      const ageGroups = result.ageDistribution;
      const group18_25 = ageGroups.find(g => g.ageGroup === '18-25');
      const group26_35 = ageGroups.find(g => g.ageGroup === '26-35');
      const group36_45 = ageGroups.find(g => g.ageGroup === '36-45');

      expect(group18_25?.count).toEqual(1);
      expect(group26_35?.count).toEqual(1);
      expect(group36_45?.count).toEqual(1);
    });
  });
});