import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  payrollComponentsTable, 
  employeeSalaryStructureTable, 
  payslipsTable,
  employeesTable 
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
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
} from '../handlers/payroll_management';
import type { 
  CreatePayrollComponentInput,
  CreateEmployeeSalaryStructureInput,
  CreatePayslipInput 
} from '../schema';

describe('Payroll Management Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data
  const testEmployee = {
    fullName: 'John Doe',
    employeeId: 'EMP001',
    dateOfBirth: '1990-05-15', // Date columns expect string format YYYY-MM-DD
    gender: 'Male' as const,
    maritalStatus: 'Single' as const,
    email: 'john.doe@company.com',
    startDate: '2023-01-15', // Date columns expect string format YYYY-MM-DD
    employmentStatus: 'Active' as const,
    role: 'Employee' as const
  };

  const testPayrollComponent: CreatePayrollComponentInput = {
    name: 'Basic Salary',
    type: 'Allowance',
    amount: 50000
  };

  // Helper function to create test employee
  const createTestEmployee = async () => {
    const result = await db.insert(employeesTable)
      .values(testEmployee)
      .returning()
      .execute();
    return result[0];
  };

  describe('Payroll Component Handlers', () => {
    it('should create a payroll component', async () => {
      const result = await createPayrollComponent(testPayrollComponent);

      expect(result.name).toEqual('Basic Salary');
      expect(result.type).toEqual('Allowance');
      expect(result.amount).toEqual(50000);
      expect(typeof result.amount).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save payroll component to database', async () => {
      const result = await createPayrollComponent(testPayrollComponent);

      const components = await db.select()
        .from(payrollComponentsTable)
        .where(eq(payrollComponentsTable.id, result.id))
        .execute();

      expect(components).toHaveLength(1);
      expect(components[0].name).toEqual('Basic Salary');
      expect(components[0].type).toEqual('Allowance');
      expect(parseFloat(components[0].amount)).toEqual(50000);
    });

    it('should get all payroll components', async () => {
      await createPayrollComponent(testPayrollComponent);
      await createPayrollComponent({
        name: 'Health Insurance',
        type: 'Deduction',
        amount: 5000
      });

      const result = await getPayrollComponents();

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBeDefined();
      expect(typeof result[0].amount).toBe('number');
      expect(result[1].amount).toBeDefined();
      expect(typeof result[1].amount).toBe('number');
    });

    it('should get payroll component by ID', async () => {
      const created = await createPayrollComponent(testPayrollComponent);
      const result = await getPayrollComponentById({ id: created.id });

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Basic Salary');
      expect(result!.type).toEqual('Allowance');
      expect(result!.amount).toEqual(50000);
      expect(typeof result!.amount).toBe('number');
    });

    it('should return null for non-existent payroll component', async () => {
      const result = await getPayrollComponentById({ id: 999 });
      expect(result).toBeNull();
    });

    it('should update payroll component', async () => {
      const created = await createPayrollComponent(testPayrollComponent);
      
      const result = await updatePayrollComponent({
        id: created.id,
        name: 'Updated Basic Salary',
        amount: 55000
      });

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Basic Salary');
      expect(result.amount).toEqual(55000);
      expect(typeof result.amount).toBe('number');
      expect(result.type).toEqual('Allowance'); // Should remain unchanged
    });

    it('should delete payroll component', async () => {
      const created = await createPayrollComponent(testPayrollComponent);
      
      const result = await deletePayrollComponent({ id: created.id });
      expect(result.success).toBe(true);

      // Verify deletion
      const components = await db.select()
        .from(payrollComponentsTable)
        .where(eq(payrollComponentsTable.id, created.id))
        .execute();
      
      expect(components).toHaveLength(0);
    });

    it('should handle non-existent payroll component deletion', async () => {
      const result = await deletePayrollComponent({ id: 999 });
      expect(result.success).toBe(false);
    });
  });

  describe('Employee Salary Structure Handlers', () => {
    let testEmployeeRecord: any;
    let testComponentRecord: any;

    beforeEach(async () => {
      testEmployeeRecord = await createTestEmployee();
      testComponentRecord = await createPayrollComponent(testPayrollComponent);
    });

    it('should create employee salary structure', async () => {
      const input: CreateEmployeeSalaryStructureInput = {
        employeeId: testEmployeeRecord.employeeId,
        componentId: testComponentRecord.id,
        amount: 45000
      };

      const result = await createEmployeeSalaryStructure(input);

      expect(result.employeeId).toEqual(testEmployeeRecord.employeeId);
      expect(result.componentId).toEqual(testComponentRecord.id);
      expect(result.amount).toEqual(45000);
      expect(typeof result.amount).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should reject salary structure for non-existent employee', async () => {
      const input: CreateEmployeeSalaryStructureInput = {
        employeeId: 'NONEXISTENT',
        componentId: testComponentRecord.id,
        amount: 45000
      };

      await expect(createEmployeeSalaryStructure(input)).rejects.toThrow(/Employee not found/);
    });

    it('should reject salary structure for non-existent component', async () => {
      const input: CreateEmployeeSalaryStructureInput = {
        employeeId: testEmployeeRecord.employeeId,
        componentId: 999,
        amount: 45000
      };

      await expect(createEmployeeSalaryStructure(input)).rejects.toThrow(/Payroll component not found/);
    });

    it('should get employee salary structure', async () => {
      const input: CreateEmployeeSalaryStructureInput = {
        employeeId: testEmployeeRecord.employeeId,
        componentId: testComponentRecord.id,
        amount: 45000
      };

      await createEmployeeSalaryStructure(input);

      const result = await getEmployeeSalaryStructure({ employeeId: testEmployeeRecord.employeeId });

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toEqual(testEmployeeRecord.employeeId);
      expect(result[0].componentId).toEqual(testComponentRecord.id);
      expect(result[0].amount).toEqual(45000);
      expect(typeof result[0].amount).toBe('number');
    });

    it('should update employee salary structure', async () => {
      const input: CreateEmployeeSalaryStructureInput = {
        employeeId: testEmployeeRecord.employeeId,
        componentId: testComponentRecord.id,
        amount: 45000
      };

      const created = await createEmployeeSalaryStructure(input);
      
      const result = await updateEmployeeSalaryStructure({
        id: created.id,
        amount: 50000
      });

      expect(result.id).toEqual(created.id);
      expect(result.amount).toEqual(50000);
      expect(typeof result.amount).toBe('number');
      expect(result.employeeId).toEqual(testEmployeeRecord.employeeId);
    });

    it('should delete employee salary structure', async () => {
      const input: CreateEmployeeSalaryStructureInput = {
        employeeId: testEmployeeRecord.employeeId,
        componentId: testComponentRecord.id,
        amount: 45000
      };

      const created = await createEmployeeSalaryStructure(input);
      
      const result = await deleteEmployeeSalaryStructure({ id: created.id });
      expect(result.success).toBe(true);

      // Verify deletion
      const structures = await db.select()
        .from(employeeSalaryStructureTable)
        .where(eq(employeeSalaryStructureTable.id, created.id))
        .execute();
      
      expect(structures).toHaveLength(0);
    });
  });

  describe('Payslip Handlers', () => {
    let testEmployeeRecord: any;

    beforeEach(async () => {
      testEmployeeRecord = await createTestEmployee();
    });

    const testPayslipInput: CreatePayslipInput = {
      employeeId: 'EMP001',
      payPeriodStart: new Date('2024-01-01'),
      payPeriodEnd: new Date('2024-01-31'),
      grossSalary: 50000,
      totalAllowances: 50000,
      totalDeductions: 5000,
      netSalary: 45000
    };

    it('should create a payslip', async () => {
      const result = await createPayslip(testPayslipInput);

      expect(result.employeeId).toEqual('EMP001');
      expect(result.payPeriodStart).toEqual(new Date('2024-01-01'));
      expect(result.payPeriodEnd).toEqual(new Date('2024-01-31'));
      expect(result.grossSalary).toEqual(50000);
      expect(typeof result.grossSalary).toBe('number');
      expect(result.totalAllowances).toEqual(50000);
      expect(typeof result.totalAllowances).toBe('number');
      expect(result.totalDeductions).toEqual(5000);
      expect(typeof result.totalDeductions).toBe('number');
      expect(result.netSalary).toEqual(45000);
      expect(typeof result.netSalary).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should reject payslip for non-existent employee', async () => {
      const input = { ...testPayslipInput, employeeId: 'NONEXISTENT' };

      await expect(createPayslip(input)).rejects.toThrow(/Employee not found/);
    });

    it('should generate payslip from salary structure', async () => {
      // Create payroll components
      const basicSalary = await createPayrollComponent({
        name: 'Basic Salary',
        type: 'Allowance',
        amount: 40000
      });

      const bonus = await createPayrollComponent({
        name: 'Performance Bonus',
        type: 'Allowance',
        amount: 10000
      });

      const tax = await createPayrollComponent({
        name: 'Income Tax',
        type: 'Deduction',
        amount: 5000
      });

      // Create salary structure
      await createEmployeeSalaryStructure({
        employeeId: testEmployeeRecord.employeeId,
        componentId: basicSalary.id,
        amount: 40000
      });

      await createEmployeeSalaryStructure({
        employeeId: testEmployeeRecord.employeeId,
        componentId: bonus.id,
        amount: 10000
      });

      await createEmployeeSalaryStructure({
        employeeId: testEmployeeRecord.employeeId,
        componentId: tax.id,
        amount: 5000
      });

      // Generate payslip
      const result = await generatePayslip({
        employeeId: testEmployeeRecord.employeeId,
        payPeriodStart: new Date('2024-01-01'),
        payPeriodEnd: new Date('2024-01-31')
      });

      expect(result.employeeId).toEqual(testEmployeeRecord.employeeId);
      expect(result.grossSalary).toEqual(50000); // 40000 + 10000
      expect(result.totalAllowances).toEqual(50000); // 40000 + 10000
      expect(result.totalDeductions).toEqual(5000); // 5000
      expect(result.netSalary).toEqual(45000); // 50000 - 5000
      expect(typeof result.grossSalary).toBe('number');
      expect(typeof result.totalAllowances).toBe('number');
      expect(typeof result.totalDeductions).toBe('number');
      expect(typeof result.netSalary).toBe('number');
    });

    it('should reject payslip generation for employee without salary structure', async () => {
      await expect(generatePayslip({
        employeeId: testEmployeeRecord.employeeId,
        payPeriodStart: new Date('2024-01-01'),
        payPeriodEnd: new Date('2024-01-31')
      })).rejects.toThrow(/No salary structure found for employee/);
    });

    it('should get all payslips', async () => {
      await createPayslip(testPayslipInput);
      await createPayslip({
        ...testPayslipInput,
        payPeriodStart: new Date('2024-02-01'),
        payPeriodEnd: new Date('2024-02-29')
      });

      const result = await getPayslips();

      expect(result).toHaveLength(2);
      result.forEach(payslip => {
        expect(typeof payslip.grossSalary).toBe('number');
        expect(typeof payslip.totalAllowances).toBe('number');
        expect(typeof payslip.totalDeductions).toBe('number');
        expect(typeof payslip.netSalary).toBe('number');
      });
    });

    it('should get payslips by employee', async () => {
      await createPayslip(testPayslipInput);

      const result = await getPayslipsByEmployee({ employeeId: testEmployeeRecord.employeeId });

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toEqual(testEmployeeRecord.employeeId);
      expect(typeof result[0].grossSalary).toBe('number');
      expect(typeof result[0].totalAllowances).toBe('number');
      expect(typeof result[0].totalDeductions).toBe('number');
      expect(typeof result[0].netSalary).toBe('number');
    });

    it('should get payslip by ID', async () => {
      const created = await createPayslip(testPayslipInput);
      const result = await getPayslipById({ id: created.id });

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.employeeId).toEqual(testEmployeeRecord.employeeId);
      expect(typeof result!.grossSalary).toBe('number');
      expect(typeof result!.totalAllowances).toBe('number');
      expect(typeof result!.totalDeductions).toBe('number');
      expect(typeof result!.netSalary).toBe('number');
    });

    it('should return null for non-existent payslip', async () => {
      const result = await getPayslipById({ id: 999 });
      expect(result).toBeNull();
    });

    it('should generate monthly payslips for all active employees', async () => {
      // Create another active employee
      const employee2 = await db.insert(employeesTable)
        .values({
          ...testEmployee,
          employeeId: 'EMP002',
          email: 'jane.doe@company.com',
          fullName: 'Jane Doe'
        })
        .returning()
        .execute();

      // Create inactive employee (should be skipped)
      await db.insert(employeesTable)
        .values({
          ...testEmployee,
          employeeId: 'EMP003',
          email: 'inactive@company.com',
          fullName: 'Inactive Employee',
          employmentStatus: 'Terminated'
        })
        .returning()
        .execute();

      // Create salary structures for active employees
      const basicSalary = await createPayrollComponent({
        name: 'Basic Salary',
        type: 'Allowance',
        amount: 50000
      });

      await createEmployeeSalaryStructure({
        employeeId: testEmployeeRecord.employeeId,
        componentId: basicSalary.id,
        amount: 50000
      });

      await createEmployeeSalaryStructure({
        employeeId: employee2[0].employeeId,
        componentId: basicSalary.id,
        amount: 50000
      });

      const result = await generateMonthlyPayslips({
        year: 2024,
        month: 1
      });

      expect(result).toHaveLength(2); // Only active employees
      expect(result.every(p => p.payPeriodStart.toDateString() === new Date('2024-01-01').toDateString())).toBe(true);
      expect(result.every(p => p.payPeriodEnd.toDateString() === new Date('2024-01-31').toDateString())).toBe(true);
      
      result.forEach(payslip => {
        expect(typeof payslip.grossSalary).toBe('number');
        expect(typeof payslip.totalAllowances).toBe('number');
        expect(typeof payslip.totalDeductions).toBe('number');
        expect(typeof payslip.netSalary).toBe('number');
      });
    });

    it('should return existing payslips when generating monthly payslips', async () => {
      // Create salary structure
      const basicSalary = await createPayrollComponent({
        name: 'Basic Salary',
        type: 'Allowance',
        amount: 50000
      });

      await createEmployeeSalaryStructure({
        employeeId: testEmployeeRecord.employeeId,
        componentId: basicSalary.id,
        amount: 50000
      });

      // Generate payslips first time
      const firstResult = await generateMonthlyPayslips({
        year: 2024,
        month: 1
      });

      expect(firstResult).toHaveLength(1);

      // Generate again - should return existing payslip
      const secondResult = await generateMonthlyPayslips({
        year: 2024,
        month: 1
      });

      expect(secondResult).toHaveLength(1);
      expect(secondResult[0].id).toEqual(firstResult[0].id);
      expect(typeof secondResult[0].grossSalary).toBe('number');
    });

    it('should return empty array when no active employees', async () => {
      // Update employee to inactive
      await db.update(employeesTable)
        .set({ employmentStatus: 'Terminated' })
        .where(eq(employeesTable.employeeId, testEmployeeRecord.employeeId))
        .execute();

      const result = await generateMonthlyPayslips({
        year: 2024,
        month: 1
      });

      expect(result).toHaveLength(0);
    });
  });
});