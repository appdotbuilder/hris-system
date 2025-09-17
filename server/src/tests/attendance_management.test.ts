import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  attendanceTable, 
  leaveRequestsTable, 
  leaveBalancesTable,
  employeesTable 
} from '../db/schema';
import { 
  type CreateAttendanceInput, 
  type UpdateAttendanceInput,
  type CreateLeaveRequestInput,
  type UpdateLeaveRequestStatusInput,
  type CreateLeaveBalanceInput,
  type IdParam,
  type EmployeeIdParam
} from '../schema';
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
} from '../handlers/attendance_management';
import { eq } from 'drizzle-orm';

// Test data
const testEmployee = {
  fullName: 'John Doe',
  employeeId: 'EMP001',
  dateOfBirth: '1990-01-01',
  gender: 'Male' as const,
  maritalStatus: 'Single' as const,
  email: 'john.doe@company.com',
  startDate: '2023-01-01',
  employmentStatus: 'Active' as const,
  role: 'Employee' as const
};

const testAttendanceInput: CreateAttendanceInput = {
  employeeId: 'EMP001',
  checkInTime: new Date('2024-01-15T09:00:00Z'),
  checkOutTime: null
};

const testLeaveRequestInput: CreateLeaveRequestInput = {
  employeeId: 'EMP001',
  leaveType: 'Annual Leave',
  startDate: new Date('2024-02-01'),
  endDate: new Date('2024-02-03'),
  reason: 'Personal vacation'
};

const testLeaveBalanceInput: CreateLeaveBalanceInput = {
  employeeId: 'EMP001',
  annualLeaveBalance: 25,
  sickLeaveBalance: 10,
  personalLeaveBalance: 5
};

describe('Attendance Management', () => {
  beforeEach(async () => {
    await createDB();
    // Create test employee
    await db.insert(employeesTable).values(testEmployee).execute();
  });
  
  afterEach(resetDB);

  describe('Attendance handlers', () => {
    it('should create attendance record', async () => {
      const result = await createAttendance(testAttendanceInput);

      expect(result.employeeId).toEqual('EMP001');
      expect(result.checkInTime).toBeInstanceOf(Date);
      expect(result.checkOutTime).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save attendance record to database', async () => {
      const result = await createAttendance(testAttendanceInput);

      const records = await db.select()
        .from(attendanceTable)
        .where(eq(attendanceTable.id, result.id))
        .execute();

      expect(records).toHaveLength(1);
      expect(records[0].employeeId).toEqual('EMP001');
      expect(records[0].checkInTime).toBeInstanceOf(Date);
    });

    it('should throw error when creating attendance for non-existent employee', async () => {
      const invalidInput = { ...testAttendanceInput, employeeId: 'INVALID' };
      
      await expect(createAttendance(invalidInput)).rejects.toThrow(/employee not found/i);
    });

    it('should update attendance record with check-out time', async () => {
      // Create attendance record first
      const attendance = await createAttendance(testAttendanceInput);
      
      const updateInput: UpdateAttendanceInput = {
        id: attendance.id,
        checkOutTime: new Date('2024-01-15T17:00:00Z')
      };

      const result = await updateAttendance(updateInput);

      expect(result.id).toEqual(attendance.id);
      expect(result.checkOutTime).toBeInstanceOf(Date);
      expect(result.checkOutTime?.getHours()).toEqual(17);
    });

    it('should throw error when updating non-existent attendance', async () => {
      const updateInput: UpdateAttendanceInput = {
        id: 999,
        checkOutTime: new Date()
      };

      await expect(updateAttendance(updateInput)).rejects.toThrow(/attendance record not found/i);
    });

    it('should get attendance records by employee', async () => {
      // Create multiple attendance records
      await createAttendance(testAttendanceInput);
      await createAttendance({
        ...testAttendanceInput,
        checkInTime: new Date('2024-01-16T09:00:00Z')
      });

      const params: EmployeeIdParam = { employeeId: 'EMP001' };
      const results = await getAttendanceByEmployee(params);

      expect(results).toHaveLength(2);
      expect(results[0].employeeId).toEqual('EMP001');
      expect(results[1].employeeId).toEqual('EMP001');
      // Should be ordered by checkInTime descending
      expect(results[0].checkInTime >= results[1].checkInTime).toBe(true);
    });

    it('should get today\'s attendance records', async () => {
      const today = new Date();
      const todayAttendance = {
        ...testAttendanceInput,
        checkInTime: today
      };
      
      // Create today's attendance
      await createAttendance(todayAttendance);
      
      // Create yesterday's attendance (should not be included)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      await createAttendance({
        ...testAttendanceInput,
        checkInTime: yesterday
      });

      const results = await getTodayAttendance();

      expect(results).toHaveLength(1);
      expect(results[0].employeeId).toEqual('EMP001');
      expect(results[0].checkInTime.toDateString()).toEqual(today.toDateString());
    });

    it('should get attendance records by date range', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-17');
      
      // Create attendance records within range
      await createAttendance({
        ...testAttendanceInput,
        checkInTime: new Date('2024-01-15T09:00:00Z')
      });
      await createAttendance({
        ...testAttendanceInput,
        checkInTime: new Date('2024-01-16T09:00:00Z')
      });
      
      // Create attendance outside range (should not be included)
      await createAttendance({
        ...testAttendanceInput,
        checkInTime: new Date('2024-01-20T09:00:00Z')
      });

      const results = await getAttendanceByDateRange({
        employeeId: 'EMP001',
        startDate,
        endDate
      });

      expect(results).toHaveLength(2);
      results.forEach(record => {
        expect(record.checkInTime >= startDate).toBe(true);
        expect(record.checkInTime <= endDate).toBe(true);
      });
    });
  });

  describe('Leave Request handlers', () => {
    it('should create leave request', async () => {
      const result = await createLeaveRequest(testLeaveRequestInput);

      expect(result.employeeId).toEqual('EMP001');
      expect(result.leaveType).toEqual('Annual Leave');
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.reason).toEqual('Personal vacation');
      expect(result.status).toEqual('Pending');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save leave request to database', async () => {
      const result = await createLeaveRequest(testLeaveRequestInput);

      const records = await db.select()
        .from(leaveRequestsTable)
        .where(eq(leaveRequestsTable.id, result.id))
        .execute();

      expect(records).toHaveLength(1);
      expect(records[0].employeeId).toEqual('EMP001');
      expect(records[0].leaveType).toEqual('Annual Leave');
    });

    it('should throw error when creating leave request for non-existent employee', async () => {
      const invalidInput = { ...testLeaveRequestInput, employeeId: 'INVALID' };
      
      await expect(createLeaveRequest(invalidInput)).rejects.toThrow(/employee not found/i);
    });

    it('should get all leave requests', async () => {
      await createLeaveRequest(testLeaveRequestInput);
      await createLeaveRequest({
        ...testLeaveRequestInput,
        leaveType: 'Sick Leave',
        reason: 'Medical appointment'
      });

      const results = await getLeaveRequests();

      expect(results).toHaveLength(2);
      expect(results[0].employeeId).toEqual('EMP001');
      expect(results[1].employeeId).toEqual('EMP001');
    });

    it('should get leave requests by employee', async () => {
      await createLeaveRequest(testLeaveRequestInput);

      const params: EmployeeIdParam = { employeeId: 'EMP001' };
      const results = await getLeaveRequestsByEmployee(params);

      expect(results).toHaveLength(1);
      expect(results[0].employeeId).toEqual('EMP001');
      expect(results[0].leaveType).toEqual('Annual Leave');
    });

    it('should get pending leave requests', async () => {
      // Create pending leave request
      const pendingRequest = await createLeaveRequest(testLeaveRequestInput);
      
      // Create approved leave request
      await createLeaveRequest({
        ...testLeaveRequestInput,
        reason: 'Another request'
      });
      
      // Update one to approved
      await db.update(leaveRequestsTable)
        .set({ status: 'Approved' })
        .where(eq(leaveRequestsTable.id, pendingRequest.id))
        .execute();

      const results = await getPendingLeaveRequests();

      expect(results).toHaveLength(1);
      expect(results[0].status).toEqual('Pending');
    });

    it('should update leave request status', async () => {
      const leaveRequest = await createLeaveRequest(testLeaveRequestInput);
      
      const updateInput: UpdateLeaveRequestStatusInput = {
        id: leaveRequest.id,
        status: 'Approved'
      };

      const result = await updateLeaveRequestStatus(updateInput);

      expect(result.id).toEqual(leaveRequest.id);
      expect(result.status).toEqual('Approved');
    });

    it('should throw error when updating non-existent leave request', async () => {
      const updateInput: UpdateLeaveRequestStatusInput = {
        id: 999,
        status: 'Approved'
      };

      await expect(updateLeaveRequestStatus(updateInput)).rejects.toThrow(/leave request not found/i);
    });

    it('should delete leave request', async () => {
      const leaveRequest = await createLeaveRequest(testLeaveRequestInput);
      
      const params: IdParam = { id: leaveRequest.id };
      const result = await deleteLeaveRequest(params);

      expect(result.success).toBe(true);

      // Verify deletion
      const records = await db.select()
        .from(leaveRequestsTable)
        .where(eq(leaveRequestsTable.id, leaveRequest.id))
        .execute();

      expect(records).toHaveLength(0);
    });
  });

  describe('Leave Balance handlers', () => {
    it('should create leave balance', async () => {
      const result = await createLeaveBalance(testLeaveBalanceInput);

      expect(result.employeeId).toEqual('EMP001');
      expect(result.annualLeaveBalance).toEqual(25);
      expect(result.sickLeaveBalance).toEqual(10);
      expect(result.personalLeaveBalance).toEqual(5);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save leave balance to database', async () => {
      const result = await createLeaveBalance(testLeaveBalanceInput);

      const records = await db.select()
        .from(leaveBalancesTable)
        .where(eq(leaveBalancesTable.id, result.id))
        .execute();

      expect(records).toHaveLength(1);
      expect(records[0].employeeId).toEqual('EMP001');
      expect(records[0].annualLeaveBalance).toEqual(25);
    });

    it('should throw error when creating leave balance for non-existent employee', async () => {
      const invalidInput = { ...testLeaveBalanceInput, employeeId: 'INVALID' };
      
      await expect(createLeaveBalance(invalidInput)).rejects.toThrow(/employee not found/i);
    });

    it('should get leave balance for employee', async () => {
      await createLeaveBalance(testLeaveBalanceInput);

      const params: EmployeeIdParam = { employeeId: 'EMP001' };
      const result = await getLeaveBalance(params);

      expect(result).not.toBeNull();
      expect(result!.employeeId).toEqual('EMP001');
      expect(result!.annualLeaveBalance).toEqual(25);
      expect(result!.sickLeaveBalance).toEqual(10);
      expect(result!.personalLeaveBalance).toEqual(5);
    });

    it('should return null for non-existent employee leave balance', async () => {
      const params: EmployeeIdParam = { employeeId: 'NONEXISTENT' };
      const result = await getLeaveBalance(params);

      expect(result).toBeNull();
    });

    it('should update leave balance for annual leave', async () => {
      await createLeaveBalance(testLeaveBalanceInput);

      const result = await updateLeaveBalance({
        employeeId: 'EMP001',
        leaveType: 'Annual Leave',
        days: 3
      });

      expect(result.annualLeaveBalance).toEqual(22); // 25 - 3
      expect(result.sickLeaveBalance).toEqual(10); // unchanged
      expect(result.personalLeaveBalance).toEqual(5); // unchanged
    });

    it('should update leave balance for sick leave', async () => {
      await createLeaveBalance(testLeaveBalanceInput);

      const result = await updateLeaveBalance({
        employeeId: 'EMP001',
        leaveType: 'Sick Leave',
        days: 2
      });

      expect(result.annualLeaveBalance).toEqual(25); // unchanged
      expect(result.sickLeaveBalance).toEqual(8); // 10 - 2
      expect(result.personalLeaveBalance).toEqual(5); // unchanged
    });

    it('should update leave balance for personal leave', async () => {
      await createLeaveBalance(testLeaveBalanceInput);

      const result = await updateLeaveBalance({
        employeeId: 'EMP001',
        leaveType: 'Personal Leave',
        days: 1
      });

      expect(result.annualLeaveBalance).toEqual(25); // unchanged
      expect(result.sickLeaveBalance).toEqual(10); // unchanged
      expect(result.personalLeaveBalance).toEqual(4); // 5 - 1
    });

    it('should not allow negative leave balance', async () => {
      await createLeaveBalance(testLeaveBalanceInput);

      const result = await updateLeaveBalance({
        employeeId: 'EMP001',
        leaveType: 'Personal Leave',
        days: 10 // More than available (5)
      });

      expect(result.personalLeaveBalance).toEqual(0); // Should not go negative
    });

    it('should throw error for invalid leave type', async () => {
      await createLeaveBalance(testLeaveBalanceInput);

      await expect(updateLeaveBalance({
        employeeId: 'EMP001',
        leaveType: 'Invalid Leave Type',
        days: 1
      })).rejects.toThrow(/invalid leave type/i);
    });

    it('should throw error when updating leave balance for non-existent employee', async () => {
      await expect(updateLeaveBalance({
        employeeId: 'NONEXISTENT',
        leaveType: 'Annual Leave',
        days: 1
      })).rejects.toThrow(/leave balance not found/i);
    });
  });
});