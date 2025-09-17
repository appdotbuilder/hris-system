import { db } from '../db';
import { 
  attendanceTable, 
  leaveRequestsTable, 
  leaveBalancesTable,
  employeesTable 
} from '../db/schema';
import { 
  type Attendance, 
  type CreateAttendanceInput, 
  type UpdateAttendanceInput,
  type LeaveRequest,
  type CreateLeaveRequestInput,
  type UpdateLeaveRequestStatusInput,
  type LeaveBalance,
  type CreateLeaveBalanceInput,
  type IdParam,
  type EmployeeIdParam
} from '../schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

// Helper function to convert date to string for date fields
const dateToString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to convert database leave request to return type
const convertLeaveRequest = (dbResult: any): LeaveRequest => {
  return {
    ...dbResult,
    startDate: new Date(dbResult.startDate),
    endDate: new Date(dbResult.endDate)
  };
};

// Attendance handlers
export const createAttendance = async (input: CreateAttendanceInput): Promise<Attendance> => {
  try {
    // Verify employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.employeeId))
      .execute();

    if (employee.length === 0) {
      throw new Error('Employee not found');
    }

    // Insert attendance record
    const result = await db.insert(attendanceTable)
      .values({
        employeeId: input.employeeId,
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Attendance creation failed:', error);
    throw error;
  }
};

export const updateAttendance = async (input: UpdateAttendanceInput): Promise<Attendance> => {
  try {
    const result = await db.update(attendanceTable)
      .set({
        checkOutTime: input.checkOutTime
      })
      .where(eq(attendanceTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Attendance record not found');
    }

    return result[0];
  } catch (error) {
    console.error('Attendance update failed:', error);
    throw error;
  }
};

export const getAttendanceByEmployee = async (params: EmployeeIdParam): Promise<Attendance[]> => {
  try {
    const results = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.employeeId, params.employeeId))
      .orderBy(desc(attendanceTable.checkInTime))
      .execute();

    return results;
  } catch (error) {
    console.error('Get attendance by employee failed:', error);
    throw error;
  }
};

export const getTodayAttendance = async (): Promise<Attendance[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = await db.select()
      .from(attendanceTable)
      .where(
        and(
          gte(attendanceTable.checkInTime, today),
          lte(attendanceTable.checkInTime, tomorrow)
        )
      )
      .orderBy(desc(attendanceTable.checkInTime))
      .execute();

    return results;
  } catch (error) {
    console.error('Get today attendance failed:', error);
    throw error;
  }
};

export const getAttendanceByDateRange = async (params: { 
  employeeId: string; 
  startDate: Date; 
  endDate: Date 
}): Promise<Attendance[]> => {
  try {
    const results = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employeeId, params.employeeId),
          gte(attendanceTable.checkInTime, params.startDate),
          lte(attendanceTable.checkInTime, params.endDate)
        )
      )
      .orderBy(desc(attendanceTable.checkInTime))
      .execute();

    return results;
  } catch (error) {
    console.error('Get attendance by date range failed:', error);
    throw error;
  }
};

// Leave request handlers
export const createLeaveRequest = async (input: CreateLeaveRequestInput): Promise<LeaveRequest> => {
  try {
    // Verify employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.employeeId))
      .execute();

    if (employee.length === 0) {
      throw new Error('Employee not found');
    }

    // Insert leave request
    const result = await db.insert(leaveRequestsTable)
      .values({
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        startDate: dateToString(input.startDate),
        endDate: dateToString(input.endDate),
        reason: input.reason,
        status: 'Pending'
      })
      .returning()
      .execute();

    return convertLeaveRequest(result[0]);
  } catch (error) {
    console.error('Leave request creation failed:', error);
    throw error;
  }
};

export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
  try {
    const results = await db.select()
      .from(leaveRequestsTable)
      .orderBy(desc(leaveRequestsTable.created_at))
      .execute();

    return results.map(convertLeaveRequest);
  } catch (error) {
    console.error('Get leave requests failed:', error);
    throw error;
  }
};

export const getLeaveRequestsByEmployee = async (params: EmployeeIdParam): Promise<LeaveRequest[]> => {
  try {
    const results = await db.select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.employeeId, params.employeeId))
      .orderBy(desc(leaveRequestsTable.created_at))
      .execute();

    return results.map(convertLeaveRequest);
  } catch (error) {
    console.error('Get leave requests by employee failed:', error);
    throw error;
  }
};

export const getPendingLeaveRequests = async (): Promise<LeaveRequest[]> => {
  try {
    const results = await db.select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.status, 'Pending'))
      .orderBy(desc(leaveRequestsTable.created_at))
      .execute();

    return results.map(convertLeaveRequest);
  } catch (error) {
    console.error('Get pending leave requests failed:', error);
    throw error;
  }
};

export const updateLeaveRequestStatus = async (input: UpdateLeaveRequestStatusInput): Promise<LeaveRequest> => {
  try {
    const result = await db.update(leaveRequestsTable)
      .set({
        status: input.status
      })
      .where(eq(leaveRequestsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Leave request not found');
    }

    return convertLeaveRequest(result[0]);
  } catch (error) {
    console.error('Leave request status update failed:', error);
    throw error;
  }
};

export const deleteLeaveRequest = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(leaveRequestsTable)
      .where(eq(leaveRequestsTable.id, params.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Leave request deletion failed:', error);
    throw error;
  }
};

// Leave balance handlers
export const createLeaveBalance = async (input: CreateLeaveBalanceInput): Promise<LeaveBalance> => {
  try {
    // Verify employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.employeeId))
      .execute();

    if (employee.length === 0) {
      throw new Error('Employee not found');
    }

    // Insert leave balance
    const result = await db.insert(leaveBalancesTable)
      .values({
        employeeId: input.employeeId,
        annualLeaveBalance: input.annualLeaveBalance,
        sickLeaveBalance: input.sickLeaveBalance,
        personalLeaveBalance: input.personalLeaveBalance
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Leave balance creation failed:', error);
    throw error;
  }
};

export const getLeaveBalance = async (params: EmployeeIdParam): Promise<LeaveBalance | null> => {
  try {
    const results = await db.select()
      .from(leaveBalancesTable)
      .where(eq(leaveBalancesTable.employeeId, params.employeeId))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get leave balance failed:', error);
    throw error;
  }
};

export const updateLeaveBalance = async (params: { 
  employeeId: string; 
  leaveType: string; 
  days: number 
}): Promise<LeaveBalance> => {
  try {
    // Get current leave balance
    const currentBalance = await db.select()
      .from(leaveBalancesTable)
      .where(eq(leaveBalancesTable.employeeId, params.employeeId))
      .execute();

    if (currentBalance.length === 0) {
      throw new Error('Leave balance not found for employee');
    }

    const balance = currentBalance[0];
    
    // Calculate new balances based on leave type
    let updateData: Partial<typeof leaveBalancesTable.$inferInsert> = {};
    
    switch (params.leaveType) {
      case 'Annual Leave':
        updateData.annualLeaveBalance = Math.max(0, balance.annualLeaveBalance - params.days);
        break;
      case 'Sick Leave':
        updateData.sickLeaveBalance = Math.max(0, balance.sickLeaveBalance - params.days);
        break;
      case 'Personal Leave':
        updateData.personalLeaveBalance = Math.max(0, balance.personalLeaveBalance - params.days);
        break;
      default:
        throw new Error('Invalid leave type');
    }

    // Update leave balance
    const result = await db.update(leaveBalancesTable)
      .set(updateData)
      .where(eq(leaveBalancesTable.employeeId, params.employeeId))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Leave balance update failed:', error);
    throw error;
  }
};