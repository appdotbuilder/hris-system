import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable, departmentsTable, employeeDocumentsTable } from '../db/schema';
import { 
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
  type CreateEmployeeDocumentInput
} from '../schema';
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
} from '../handlers/employee_management';
import { eq } from 'drizzle-orm';

// Test data
const testEmployeeInput: CreateEmployeeInput = {
  fullName: 'John Doe',
  employeeId: 'EMP001',
  dateOfBirth: new Date('1990-01-15'),
  gender: 'Male',
  maritalStatus: 'Single',
  address: '123 Main St, City',
  phoneNumber: '+1234567890',
  email: 'john.doe@example.com',
  position: 'Software Developer',
  department: 'Engineering',
  managerId: 'MGR001',
  startDate: new Date('2023-01-01'),
  employmentStatus: 'Active',
  bankName: 'Test Bank',
  bankAccountNumber: '1234567890',
  role: 'Employee'
};

const testDepartmentInput: CreateDepartmentInput = {
  name: 'Engineering',
  description: 'Software development department'
};

const testEmployeeDocumentInput: CreateEmployeeDocumentInput = {
  employeeId: 'EMP001',
  documentName: 'Resume',
  documentType: 'PDF',
  fileUrl: 'https://example.com/resume.pdf'
};

describe('Employee Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('Employee handlers', () => {
    it('should create an employee', async () => {
      const result = await createEmployee(testEmployeeInput);

      expect(result.fullName).toEqual('John Doe');
      expect(result.employeeId).toEqual('EMP001');
      expect(result.email).toEqual('john.doe@example.com');
      expect(result.gender).toEqual('Male');
      expect(result.maritalStatus).toEqual('Single');
      expect(result.employmentStatus).toEqual('Active');
      expect(result.role).toEqual('Employee');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save employee to database', async () => {
      const result = await createEmployee(testEmployeeInput);

      const employees = await db.select()
        .from(employeesTable)
        .where(eq(employeesTable.id, result.id))
        .execute();

      expect(employees).toHaveLength(1);
      expect(employees[0].fullName).toEqual('John Doe');
      expect(employees[0].employeeId).toEqual('EMP001');
      expect(employees[0].email).toEqual('john.doe@example.com');
    });

    it('should fetch all employees', async () => {
      await createEmployee(testEmployeeInput);
      await createEmployee({
        ...testEmployeeInput,
        employeeId: 'EMP002',
        email: 'jane.doe@example.com',
        fullName: 'Jane Doe'
      });

      const result = await getEmployees();

      expect(result).toHaveLength(2);
      expect(result[0].fullName).toEqual('John Doe');
      expect(result[1].fullName).toEqual('Jane Doe');
    });

    it('should get employee by ID', async () => {
      const created = await createEmployee(testEmployeeInput);
      
      const result = await getEmployeeById({ id: created.id });

      expect(result).not.toBeNull();
      expect(result!.fullName).toEqual('John Doe');
      expect(result!.employeeId).toEqual('EMP001');
    });

    it('should return null for non-existent employee ID', async () => {
      const result = await getEmployeeById({ id: 999 });
      expect(result).toBeNull();
    });

    it('should get employee by employee ID', async () => {
      await createEmployee(testEmployeeInput);
      
      const result = await getEmployeeByEmployeeId({ employeeId: 'EMP001' });

      expect(result).not.toBeNull();
      expect(result!.fullName).toEqual('John Doe');
      expect(result!.employeeId).toEqual('EMP001');
    });

    it('should return null for non-existent employee ID string', async () => {
      const result = await getEmployeeByEmployeeId({ employeeId: 'NONEXISTENT' });
      expect(result).toBeNull();
    });

    it('should update an employee', async () => {
      const created = await createEmployee(testEmployeeInput);
      
      const updateInput: UpdateEmployeeInput = {
        id: created.id,
        fullName: 'John Smith',
        position: 'Senior Developer',
        employmentStatus: 'On Leave'
      };

      const result = await updateEmployee(updateInput);

      expect(result.fullName).toEqual('John Smith');
      expect(result.position).toEqual('Senior Developer');
      expect(result.employmentStatus).toEqual('On Leave');
      expect(result.email).toEqual('john.doe@example.com'); // Unchanged
    });

    it('should throw error when updating non-existent employee', async () => {
      const updateInput: UpdateEmployeeInput = {
        id: 999,
        fullName: 'Non Existent'
      };

      await expect(updateEmployee(updateInput)).rejects.toThrow(/Employee not found/i);
    });

    it('should delete an employee', async () => {
      const created = await createEmployee(testEmployeeInput);
      
      const result = await deleteEmployee({ id: created.id });

      expect(result.success).toBe(true);

      // Verify deletion
      const deleted = await getEmployeeById({ id: created.id });
      expect(deleted).toBeNull();
    });

    it('should return false when deleting non-existent employee', async () => {
      const result = await deleteEmployee({ id: 999 });
      expect(result.success).toBe(false);
    });

    it('should enforce unique employee ID constraint', async () => {
      await createEmployee(testEmployeeInput);
      
      const duplicateInput = {
        ...testEmployeeInput,
        email: 'different@example.com'
      };

      await expect(createEmployee(duplicateInput)).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      await createEmployee(testEmployeeInput);
      
      const duplicateInput = {
        ...testEmployeeInput,
        employeeId: 'EMP002'
      };

      await expect(createEmployee(duplicateInput)).rejects.toThrow();
    });
  });

  describe('Employee Document handlers', () => {
    it('should create an employee document', async () => {
      // Create employee first
      await createEmployee(testEmployeeInput);
      
      const result = await createEmployeeDocument(testEmployeeDocumentInput);

      expect(result.employeeId).toEqual('EMP001');
      expect(result.documentName).toEqual('Resume');
      expect(result.documentType).toEqual('PDF');
      expect(result.fileUrl).toEqual('https://example.com/resume.pdf');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error when creating document for non-existent employee', async () => {
      await expect(createEmployeeDocument(testEmployeeDocumentInput))
        .rejects.toThrow(/Employee not found/i);
    });

    it('should fetch employee documents', async () => {
      // Create employee first
      await createEmployee(testEmployeeInput);
      
      await createEmployeeDocument(testEmployeeDocumentInput);
      await createEmployeeDocument({
        ...testEmployeeDocumentInput,
        documentName: 'Contract',
        documentType: 'PDF'
      });

      const result = await getEmployeeDocuments({ employeeId: 'EMP001' });

      expect(result).toHaveLength(2);
      expect(result[0].documentName).toEqual('Resume');
      expect(result[1].documentName).toEqual('Contract');
    });

    it('should return empty array for employee with no documents', async () => {
      const result = await getEmployeeDocuments({ employeeId: 'NONEXISTENT' });
      expect(result).toHaveLength(0);
    });

    it('should delete an employee document', async () => {
      // Create employee and document first
      await createEmployee(testEmployeeInput);
      const created = await createEmployeeDocument(testEmployeeDocumentInput);
      
      const result = await deleteEmployeeDocument({ id: created.id });

      expect(result.success).toBe(true);

      // Verify deletion
      const documents = await getEmployeeDocuments({ employeeId: 'EMP001' });
      expect(documents).toHaveLength(0);
    });

    it('should return false when deleting non-existent document', async () => {
      const result = await deleteEmployeeDocument({ id: 999 });
      expect(result.success).toBe(false);
    });
  });

  describe('Department handlers', () => {
    it('should create a department', async () => {
      const result = await createDepartment(testDepartmentInput);

      expect(result.name).toEqual('Engineering');
      expect(result.description).toEqual('Software development department');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create department with null description', async () => {
      const input: CreateDepartmentInput = {
        name: 'HR'
      };

      const result = await createDepartment(input);

      expect(result.name).toEqual('HR');
      expect(result.description).toBeNull();
    });

    it('should save department to database', async () => {
      const result = await createDepartment(testDepartmentInput);

      const departments = await db.select()
        .from(departmentsTable)
        .where(eq(departmentsTable.id, result.id))
        .execute();

      expect(departments).toHaveLength(1);
      expect(departments[0].name).toEqual('Engineering');
    });

    it('should fetch all departments', async () => {
      await createDepartment(testDepartmentInput);
      await createDepartment({
        name: 'Marketing',
        description: 'Marketing and sales department'
      });

      const result = await getDepartments();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Engineering');
      expect(result[1].name).toEqual('Marketing');
    });

    it('should get department by ID', async () => {
      const created = await createDepartment(testDepartmentInput);
      
      const result = await getDepartmentById({ id: created.id });

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Engineering');
      expect(result!.description).toEqual('Software development department');
    });

    it('should return null for non-existent department ID', async () => {
      const result = await getDepartmentById({ id: 999 });
      expect(result).toBeNull();
    });

    it('should update a department', async () => {
      const created = await createDepartment(testDepartmentInput);
      
      const updateInput: UpdateDepartmentInput = {
        id: created.id,
        name: 'Software Engineering',
        description: 'Advanced software development department'
      };

      const result = await updateDepartment(updateInput);

      expect(result.name).toEqual('Software Engineering');
      expect(result.description).toEqual('Advanced software development department');
    });

    it('should update only specified department fields', async () => {
      const created = await createDepartment(testDepartmentInput);
      
      const updateInput: UpdateDepartmentInput = {
        id: created.id,
        name: 'Software Engineering'
        // description not provided
      };

      const result = await updateDepartment(updateInput);

      expect(result.name).toEqual('Software Engineering');
      expect(result.description).toEqual('Software development department'); // Unchanged
    });

    it('should throw error when updating non-existent department', async () => {
      const updateInput: UpdateDepartmentInput = {
        id: 999,
        name: 'Non Existent'
      };

      await expect(updateDepartment(updateInput)).rejects.toThrow(/Department not found/i);
    });

    it('should delete a department', async () => {
      const created = await createDepartment(testDepartmentInput);
      
      const result = await deleteDepartment({ id: created.id });

      expect(result.success).toBe(true);

      // Verify deletion
      const deleted = await getDepartmentById({ id: created.id });
      expect(deleted).toBeNull();
    });

    it('should return false when deleting non-existent department', async () => {
      const result = await deleteDepartment({ id: 999 });
      expect(result.success).toBe(false);
    });

    it('should enforce unique department name constraint', async () => {
      await createDepartment(testDepartmentInput);
      
      const duplicateInput = {
        name: 'Engineering',
        description: 'Another engineering department'
      };

      await expect(createDepartment(duplicateInput)).rejects.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle employee with department reference', async () => {
      // Create department first
      const department = await createDepartment(testDepartmentInput);
      
      // Create employee referencing department name
      const employeeInput: CreateEmployeeInput = {
        ...testEmployeeInput,
        department: department.name
      };

      const employee = await createEmployee(employeeInput);

      expect(employee.department).toEqual('Engineering');
    });

    it('should handle employee hierarchy with manager', async () => {
      // Create manager first
      const managerInput: CreateEmployeeInput = {
        ...testEmployeeInput,
        employeeId: 'MGR001',
        email: 'manager@example.com',
        role: 'Manager'
      };
      await createEmployee(managerInput);

      // Create employee with manager reference
      const result = await createEmployee(testEmployeeInput);

      expect(result.managerId).toEqual('MGR001');
    });

    it('should handle multiple documents for single employee', async () => {
      // Create employee
      await createEmployee(testEmployeeInput);

      // Create multiple documents
      await createEmployeeDocument(testEmployeeDocumentInput);
      await createEmployeeDocument({
        ...testEmployeeDocumentInput,
        documentName: 'ID Copy',
        documentType: 'PNG'
      });
      await createEmployeeDocument({
        ...testEmployeeDocumentInput,
        documentName: 'Contract',
        documentType: 'PDF'
      });

      const documents = await getEmployeeDocuments({ employeeId: 'EMP001' });

      expect(documents).toHaveLength(3);
      expect(documents.map(doc => doc.documentName)).toEqual(['Resume', 'ID Copy', 'Contract']);
    });
  });
});