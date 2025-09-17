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
import { type EmployeeIdParam } from '../schema';
import { count, eq, and, gte, lte, avg, sum, sql, desc, isNull, inArray } from 'drizzle-orm';

// Dashboard analytics and overview handlers
export const getDashboardOverview = async (): Promise<{
  totalEmployees: number;
  activeEmployees: number;
  employeesOnLeave: number;
  totalDepartments: number;
  pendingLeaveRequests: number;
  todayAttendance: number;
  openVacancies: number;
  totalApplicants: number;
  overdueGoals: number;
  averageRating: number;
}> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total and active employees
    const [totalEmployeesResult] = await db.select({ count: count() })
      .from(employeesTable)
      .execute();

    const [activeEmployeesResult] = await db.select({ count: count() })
      .from(employeesTable)
      .where(eq(employeesTable.employmentStatus, 'Active'))
      .execute();

    const [employeesOnLeaveResult] = await db.select({ count: count() })
      .from(employeesTable)
      .where(eq(employeesTable.employmentStatus, 'On Leave'))
      .execute();

    // Get total departments
    const [totalDepartmentsResult] = await db.select({ count: count() })
      .from(departmentsTable)
      .execute();

    // Get pending leave requests
    const [pendingLeaveRequestsResult] = await db.select({ count: count() })
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.status, 'Pending'))
      .execute();

    // Get today's attendance
    const [todayAttendanceResult] = await db.select({ count: count() })
      .from(attendanceTable)
      .where(
        and(
          gte(attendanceTable.checkInTime, today),
          lte(attendanceTable.checkInTime, tomorrow)
        )
      )
      .execute();

    // Get open vacancies
    const [openVacanciesResult] = await db.select({ count: count() })
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.status, 'Open'))
      .execute();

    // Get total applicants
    const [totalApplicantsResult] = await db.select({ count: count() })
      .from(applicantsTable)
      .execute();

    // Get overdue goals
    const todayString = today.toISOString().split('T')[0];
    const [overdueGoalsResult] = await db.select({ count: count() })
      .from(performanceGoalsTable)
      .where(
        and(
          lte(performanceGoalsTable.dueDate, todayString),
          inArray(performanceGoalsTable.status, ['Not Started', 'In Progress'])
        )
      )
      .execute();

    // Get average rating
    const [averageRatingResult] = await db.select({ 
      average: avg(performanceReviewsTable.overallRating) 
    })
      .from(performanceReviewsTable)
      .execute();

    return {
      totalEmployees: totalEmployeesResult.count,
      activeEmployees: activeEmployeesResult.count,
      employeesOnLeave: employeesOnLeaveResult.count,
      totalDepartments: totalDepartmentsResult.count,
      pendingLeaveRequests: pendingLeaveRequestsResult.count,
      todayAttendance: todayAttendanceResult.count,
      openVacancies: openVacanciesResult.count,
      totalApplicants: totalApplicantsResult.count,
      overdueGoals: overdueGoalsResult.count,
      averageRating: averageRatingResult.average ? parseFloat(averageRatingResult.average.toString()) : 0
    };
  } catch (error) {
    console.error('Dashboard overview failed:', error);
    throw error;
  }
};

export const getEmployeeDashboard = async (params: EmployeeIdParam): Promise<{
  employee: {
    fullName: string;
    position: string;
    department: string;
    employmentStatus: string;
  };
  leaveBalance: {
    annualLeaveBalance: number;
    sickLeaveBalance: number;
    personalLeaveBalance: number;
  };
  recentAttendance: Array<{
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
  }>;
  pendingLeaveRequests: number;
  activeGoals: number;
  completedGoals: number;
  lastPayslip: {
    payPeriod: string;
    netSalary: number;
  } | null;
}> => {
  try {
    // Get employee details
    const [employee] = await db.select({
      fullName: employeesTable.fullName,
      position: employeesTable.position,
      department: employeesTable.department,
      employmentStatus: employeesTable.employmentStatus
    })
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, params.employeeId))
      .execute();

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get leave balance
    const [leaveBalance] = await db.select()
      .from(leaveBalancesTable)
      .where(eq(leaveBalancesTable.employeeId, params.employeeId))
      .execute();

    // Get recent attendance (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAttendance = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employeeId, params.employeeId),
          gte(attendanceTable.checkInTime, sevenDaysAgo)
        )
      )
      .orderBy(desc(attendanceTable.checkInTime))
      .limit(7)
      .execute();

    // Get pending leave requests count
    const [pendingLeaveRequestsResult] = await db.select({ count: count() })
      .from(leaveRequestsTable)
      .where(
        and(
          eq(leaveRequestsTable.employeeId, params.employeeId),
          eq(leaveRequestsTable.status, 'Pending')
        )
      )
      .execute();

    // Get active goals count
    const [activeGoalsResult] = await db.select({ count: count() })
      .from(performanceGoalsTable)
      .where(
        and(
          eq(performanceGoalsTable.employeeId, params.employeeId),
          eq(performanceGoalsTable.status, 'In Progress')
        )
      )
      .execute();

    // Get completed goals count
    const [completedGoalsResult] = await db.select({ count: count() })
      .from(performanceGoalsTable)
      .where(
        and(
          eq(performanceGoalsTable.employeeId, params.employeeId),
          eq(performanceGoalsTable.status, 'Completed')
        )
      )
      .execute();

    // Get last payslip
    const [lastPayslip] = await db.select()
      .from(payslipsTable)
      .where(eq(payslipsTable.employeeId, params.employeeId))
      .orderBy(desc(payslipsTable.payPeriodEnd))
      .limit(1)
      .execute();

    return {
      employee: {
        fullName: employee.fullName,
        position: employee.position || '',
        department: employee.department || '',
        employmentStatus: employee.employmentStatus
      },
      leaveBalance: {
        annualLeaveBalance: leaveBalance?.annualLeaveBalance || 0,
        sickLeaveBalance: leaveBalance?.sickLeaveBalance || 0,
        personalLeaveBalance: leaveBalance?.personalLeaveBalance || 0
      },
      recentAttendance: recentAttendance.map(record => ({
        date: record.checkInTime.toISOString().split('T')[0],
        checkInTime: record.checkInTime.toISOString(),
        checkOutTime: record.checkOutTime?.toISOString() || null
      })),
      pendingLeaveRequests: pendingLeaveRequestsResult.count,
      activeGoals: activeGoalsResult.count,
      completedGoals: completedGoalsResult.count,
      lastPayslip: lastPayslip ? {
        payPeriod: `${lastPayslip.payPeriodStart} - ${lastPayslip.payPeriodEnd}`,
        netSalary: parseFloat(lastPayslip.netSalary)
      } : null
    };
  } catch (error) {
    console.error('Employee dashboard failed:', error);
    throw error;
  }
};

export const getManagerDashboard = async (params: EmployeeIdParam): Promise<{
  teamSize: number;
  teamAttendanceToday: number;
  pendingLeaveApprovals: number;
  teamGoalsOverdue: number;
  teamPerformanceAverage: number;
  directReports: Array<{
    employeeId: string;
    fullName: string;
    position: string;
    attendanceToday: boolean;
    pendingLeaveRequests: number;
  }>;
}> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get direct reports
    const directReports = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.managerId, params.employeeId))
      .execute();

    const directReportIds = directReports.map(emp => emp.employeeId);

    let teamAttendanceToday = 0;
    let pendingLeaveApprovals = 0;
    let teamGoalsOverdue = 0;
    let teamPerformanceAverage = 0;

    if (directReportIds.length > 0) {
      // Get team attendance today
      const [teamAttendanceTodayResult] = await db.select({ count: count() })
        .from(attendanceTable)
        .where(
          and(
            inArray(attendanceTable.employeeId, directReportIds),
            gte(attendanceTable.checkInTime, today),
            lte(attendanceTable.checkInTime, tomorrow)
          )
        )
        .execute();

      // Get pending leave approvals for team
      const [pendingLeaveApprovalsResult] = await db.select({ count: count() })
        .from(leaveRequestsTable)
        .where(
          and(
            inArray(leaveRequestsTable.employeeId, directReportIds),
            eq(leaveRequestsTable.status, 'Pending')
          )
        )
        .execute();

      // Get team overdue goals
      const todayString = today.toISOString().split('T')[0];
      const [teamGoalsOverdueResult] = await db.select({ count: count() })
        .from(performanceGoalsTable)
        .where(
          and(
            inArray(performanceGoalsTable.employeeId, directReportIds),
            lte(performanceGoalsTable.dueDate, todayString),
            inArray(performanceGoalsTable.status, ['Not Started', 'In Progress'])
          )
        )
        .execute();

      // Get team performance average
      const [teamPerformanceAverageResult] = await db.select({ 
        average: avg(performanceReviewsTable.overallRating) 
      })
        .from(performanceReviewsTable)
        .where(inArray(performanceReviewsTable.employeeId, directReportIds))
        .execute();

      teamAttendanceToday = teamAttendanceTodayResult.count;
      pendingLeaveApprovals = pendingLeaveApprovalsResult.count;
      teamGoalsOverdue = teamGoalsOverdueResult.count;
      teamPerformanceAverage = teamPerformanceAverageResult.average ? 
        parseFloat(teamPerformanceAverageResult.average.toString()) : 0;
    }

    // Prepare direct reports with additional data
    const directReportsWithData = await Promise.all(
      directReports.map(async (employee) => {
        // Check attendance today
        const [attendanceToday] = await db.select({ count: count() })
          .from(attendanceTable)
          .where(
            and(
              eq(attendanceTable.employeeId, employee.employeeId),
              gte(attendanceTable.checkInTime, today),
              lte(attendanceTable.checkInTime, tomorrow)
            )
          )
          .execute();

        // Get pending leave requests
        const [pendingLeave] = await db.select({ count: count() })
          .from(leaveRequestsTable)
          .where(
            and(
              eq(leaveRequestsTable.employeeId, employee.employeeId),
              eq(leaveRequestsTable.status, 'Pending')
            )
          )
          .execute();

        return {
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          position: employee.position || '',
          attendanceToday: attendanceToday.count > 0,
          pendingLeaveRequests: pendingLeave.count
        };
      })
    );

    return {
      teamSize: directReports.length,
      teamAttendanceToday,
      pendingLeaveApprovals,
      teamGoalsOverdue,
      teamPerformanceAverage,
      directReports: directReportsWithData
    };
  } catch (error) {
    console.error('Manager dashboard failed:', error);
    throw error;
  }
};

export const getAttendanceStatistics = async (params: {
  startDate: Date;
  endDate: Date;
}): Promise<{
  totalWorkingDays: number;
  averageAttendanceRate: number;
  departmentAttendance: Array<{
    department: string;
    attendanceRate: number;
  }>;
  dailyAttendance: Array<{
    date: string;
    present: number;
    absent: number;
    lateArrivals: number;
  }>;
}> => {
  try {
    // Calculate total working days (excluding weekends)
    let totalWorkingDays = 0;
    const currentDate = new Date(params.startDate);
    while (currentDate <= params.endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
        totalWorkingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get total active employees
    const [totalActiveEmployees] = await db.select({ count: count() })
      .from(employeesTable)
      .where(eq(employeesTable.employmentStatus, 'Active'))
      .execute();

    // Get attendance records in date range
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(
        and(
          gte(attendanceTable.checkInTime, params.startDate),
          lte(attendanceTable.checkInTime, params.endDate)
        )
      )
      .execute();

    // Calculate average attendance rate
    const totalPossibleAttendance = totalActiveEmployees.count * totalWorkingDays;
    const averageAttendanceRate = totalPossibleAttendance > 0 ? 
      (attendanceRecords.length / totalPossibleAttendance) * 100 : 0;

    // Get department attendance (simplified - using employee department field)
    const departmentAttendanceQuery = await db.select({
      department: employeesTable.department,
      employeeId: employeesTable.employeeId
    })
      .from(employeesTable)
      .where(eq(employeesTable.employmentStatus, 'Active'))
      .execute();

    const departmentGroups = departmentAttendanceQuery.reduce((acc, emp) => {
      const dept = emp.department || 'Unassigned';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(emp.employeeId);
      return acc;
    }, {} as Record<string, string[]>);

    const departmentAttendance = await Promise.all(
      Object.entries(departmentGroups).map(async ([department, employeeIds]) => {
        const [deptAttendance] = await db.select({ count: count() })
          .from(attendanceTable)
          .where(
            and(
              inArray(attendanceTable.employeeId, employeeIds),
              gte(attendanceTable.checkInTime, params.startDate),
              lte(attendanceTable.checkInTime, params.endDate)
            )
          )
          .execute();

        const possibleAttendance = employeeIds.length * totalWorkingDays;
        const attendanceRate = possibleAttendance > 0 ? 
          (deptAttendance.count / possibleAttendance) * 100 : 0;

        return {
          department,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        };
      })
    );

    // Calculate daily attendance (simplified)
    const dailyAttendance: Array<{
      date: string;
      present: number;
      absent: number;
      lateArrivals: number;
    }> = [];

    const dateRange = new Date(params.startDate);
    while (dateRange <= params.endDate) {
      const dayStart = new Date(dateRange);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateRange);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayAttendance] = await db.select({ count: count() })
        .from(attendanceTable)
        .where(
          and(
            gte(attendanceTable.checkInTime, dayStart),
            lte(attendanceTable.checkInTime, dayEnd)
          )
        )
        .execute();

      // Simplified late arrivals calculation (after 9 AM)
      const nineAM = new Date(dateRange);
      nineAM.setHours(9, 0, 0, 0);

      const [lateArrivals] = await db.select({ count: count() })
        .from(attendanceTable)
        .where(
          and(
            gte(attendanceTable.checkInTime, nineAM),
            lte(attendanceTable.checkInTime, dayEnd)
          )
        )
        .execute();

      dailyAttendance.push({
        date: dateRange.toISOString().split('T')[0],
        present: dayAttendance.count,
        absent: totalActiveEmployees.count - dayAttendance.count,
        lateArrivals: lateArrivals.count
      });

      dateRange.setDate(dateRange.getDate() + 1);
    }

    return {
      totalWorkingDays,
      averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
      departmentAttendance,
      dailyAttendance
    };
  } catch (error) {
    console.error('Attendance statistics failed:', error);
    throw error;
  }
};

export const getPayrollStatistics = async (params: {
  year: number;
  month: number;
}): Promise<{
  totalGrossPay: number;
  totalNetPay: number;
  totalAllowances: number;
  totalDeductions: number;
  payrollByDepartment: Array<{
    department: string;
    totalGrossPay: number;
    totalNetPay: number;
    employeeCount: number;
  }>;
  averageSalary: number;
}> => {
  try {
    // Create date range for the specific month/year
    const startDate = new Date(params.year, params.month - 1, 1);
    const endDate = new Date(params.year, params.month, 0);
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    // Get payslips for the specified month/year
    const payslips = await db.select()
      .from(payslipsTable)
      .where(
        and(
          gte(payslipsTable.payPeriodStart, startDateString),
          lte(payslipsTable.payPeriodEnd, endDateString)
        )
      )
      .execute();

    // Calculate totals
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;

    payslips.forEach(payslip => {
      totalGrossPay += parseFloat(payslip.grossSalary);
      totalNetPay += parseFloat(payslip.netSalary);
      totalAllowances += parseFloat(payslip.totalAllowances);
      totalDeductions += parseFloat(payslip.totalDeductions);
    });

    // Get payroll by department
    const payrollByDepartment = await db.select({
      department: employeesTable.department,
      grossSalary: payslipsTable.grossSalary,
      netSalary: payslipsTable.netSalary,
      employeeId: payslipsTable.employeeId
    })
      .from(payslipsTable)
      .innerJoin(employeesTable, eq(payslipsTable.employeeId, employeesTable.employeeId))
      .where(
        and(
          gte(payslipsTable.payPeriodStart, startDateString),
          lte(payslipsTable.payPeriodEnd, endDateString)
        )
      )
      .execute();

    // Group by department
    const deptGroups = payrollByDepartment.reduce((acc, record) => {
      const dept = record.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          totalGrossPay: 0,
          totalNetPay: 0,
          employeeIds: new Set()
        };
      }
      acc[dept].totalGrossPay += parseFloat(record.grossSalary);
      acc[dept].totalNetPay += parseFloat(record.netSalary);
      acc[dept].employeeIds.add(record.employeeId);
      return acc;
    }, {} as Record<string, { totalGrossPay: number; totalNetPay: number; employeeIds: Set<string> }>);

    const departmentStats = Object.entries(deptGroups).map(([department, data]) => ({
      department,
      totalGrossPay: Math.round(data.totalGrossPay * 100) / 100,
      totalNetPay: Math.round(data.totalNetPay * 100) / 100,
      employeeCount: data.employeeIds.size
    }));

    const averageSalary = payslips.length > 0 ? totalNetPay / payslips.length : 0;

    return {
      totalGrossPay: Math.round(totalGrossPay * 100) / 100,
      totalNetPay: Math.round(totalNetPay * 100) / 100,
      totalAllowances: Math.round(totalAllowances * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      payrollByDepartment: departmentStats,
      averageSalary: Math.round(averageSalary * 100) / 100
    };
  } catch (error) {
    console.error('Payroll statistics failed:', error);
    throw error;
  }
};

export const getHRMetrics = async (): Promise<{
  employeeTurnoverRate: number;
  averageEmployeeTenure: number;
  newHiresThisMonth: number;
  terminationsThisMonth: number;
  genderDistribution: {
    male: number;
    female: number;
    other: number;
  };
  ageDistribution: Array<{
    ageGroup: string;
    count: number;
  }>;
  departmentDistribution: Array<{
    department: string;
    count: number;
  }>;
}> => {
  try {
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastYearStart = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    // Get all employees
    const allEmployees = await db.select()
      .from(employeesTable)
      .execute();

    // Calculate new hires this month
    const thisMonthStartString = thisMonthStart.toISOString().split('T')[0];
    const lastYearStartString = lastYearStart.toISOString().split('T')[0];
    
    const [newHiresThisMonthResult] = await db.select({ count: count() })
      .from(employeesTable)
      .where(gte(employeesTable.startDate, thisMonthStartString))
      .execute();

    // Calculate terminations this month
    const [terminationsThisMonthResult] = await db.select({ count: count() })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.employmentStatus, 'Terminated'),
          gte(employeesTable.created_at, thisMonthStart)
        )
      )
      .execute();

    // Calculate employee turnover rate (simplified)
    const [totalEmployeesLastYear] = await db.select({ count: count() })
      .from(employeesTable)
      .where(lte(employeesTable.startDate, lastYearStartString))
      .execute();

    const employeeTurnoverRate = totalEmployeesLastYear.count > 0 ? 
      (terminationsThisMonthResult.count / totalEmployeesLastYear.count) * 100 : 0;

    // Calculate average employee tenure
    let totalTenureDays = 0;
    let activeEmployeeCount = 0;

    allEmployees.forEach(employee => {
      if (employee.employmentStatus === 'Active') {
        const startDate = new Date(employee.startDate);
        const tenureDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        totalTenureDays += tenureDays;
        activeEmployeeCount++;
      }
    });

    const averageEmployeeTenure = activeEmployeeCount > 0 ? 
      Math.floor(totalTenureDays / activeEmployeeCount) : 0;

    // Gender distribution
    const genderDistribution = {
      male: 0,
      female: 0,
      other: 0
    };

    allEmployees.forEach(employee => {
      switch (employee.gender) {
        case 'Male':
          genderDistribution.male++;
          break;
        case 'Female':
          genderDistribution.female++;
          break;
        case 'Other':
          genderDistribution.other++;
          break;
      }
    });

    // Age distribution
    const ageGroups = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56+': 0
    };

    allEmployees.forEach(employee => {
      const birthDate = new Date(employee.dateOfBirth);
      const age = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      if (age >= 18 && age <= 25) ageGroups['18-25']++;
      else if (age >= 26 && age <= 35) ageGroups['26-35']++;
      else if (age >= 36 && age <= 45) ageGroups['36-45']++;
      else if (age >= 46 && age <= 55) ageGroups['46-55']++;
      else if (age >= 56) ageGroups['56+']++;
    });

    const ageDistribution = Object.entries(ageGroups).map(([ageGroup, count]) => ({
      ageGroup,
      count
    }));

    // Department distribution
    const deptGroups: Record<string, number> = {};
    allEmployees.forEach(employee => {
      const dept = employee.department || 'Unassigned';
      deptGroups[dept] = (deptGroups[dept] || 0) + 1;
    });

    const departmentDistribution = Object.entries(deptGroups).map(([department, count]) => ({
      department,
      count
    }));

    return {
      employeeTurnoverRate: Math.round(employeeTurnoverRate * 100) / 100,
      averageEmployeeTenure,
      newHiresThisMonth: newHiresThisMonthResult.count,
      terminationsThisMonth: terminationsThisMonthResult.count,
      genderDistribution,
      ageDistribution,
      departmentDistribution
    };
  } catch (error) {
    console.error('HR metrics failed:', error);
    throw error;
  }
};