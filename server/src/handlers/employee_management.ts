import { db } from '../db';
import { 
  employeesTable, 
  departmentsTable, 
  employeeDocumentsTable 
} from '../db/schema';
import { 
  type Employee, 
  type CreateEmployeeInput, 
  type UpdateEmployeeInput,
  type EmployeeDocument,
  type CreateEmployeeDocumentInput,
  type Department,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
  type IdParam,
  type EmployeeIdParam
} from '../schema';
import { eq } from 'drizzle-orm';

// Employee handlers
export const createEmployee = async (input: CreateEmployeeInput): Promise<Employee> => {
  try {
    const result = await db.insert(employeesTable)
      .values({
        fullName: input.fullName,
        employeeId: input.employeeId,
        dateOfBirth: input.dateOfBirth.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        gender: input.gender,
        maritalStatus: input.maritalStatus,
        address: input.address || null,
        phoneNumber: input.phoneNumber || null,
        email: input.email,
        position: input.position || null,
        department: input.department || null,
        managerId: input.managerId || null,
        startDate: input.startDate.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        employmentStatus: input.employmentStatus,
        bankName: input.bankName || null,
        bankAccountNumber: input.bankAccountNumber || null,
        role: input.role
      })
      .returning()
      .execute();

    // Convert string dates back to Date objects for the response
    const employee = result[0];
    return {
      ...employee,
      dateOfBirth: new Date(employee.dateOfBirth),
      startDate: new Date(employee.startDate)
    };
  } catch (error) {
    console.error('Employee creation failed:', error);
    throw error;
  }
};

export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const result = await db.select()
      .from(employeesTable)
      .execute();

    // Convert string dates back to Date objects
    return result.map(employee => ({
      ...employee,
      dateOfBirth: new Date(employee.dateOfBirth),
      startDate: new Date(employee.startDate)
    }));
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    throw error;
  }
};

export const getEmployeeById = async (params: IdParam): Promise<Employee | null> => {
  try {
    const result = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.id, params.id))
      .execute();

    if (!result[0]) return null;

    // Convert string dates back to Date objects
    const employee = result[0];
    return {
      ...employee,
      dateOfBirth: new Date(employee.dateOfBirth),
      startDate: new Date(employee.startDate)
    };
  } catch (error) {
    console.error('Failed to fetch employee by ID:', error);
    throw error;
  }
};

export const getEmployeeByEmployeeId = async (params: EmployeeIdParam): Promise<Employee | null> => {
  try {
    const result = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, params.employeeId))
      .execute();

    if (!result[0]) return null;

    // Convert string dates back to Date objects
    const employee = result[0];
    return {
      ...employee,
      dateOfBirth: new Date(employee.dateOfBirth),
      startDate: new Date(employee.startDate)
    };
  } catch (error) {
    console.error('Failed to fetch employee by employee ID:', error);
    throw error;
  }
};

export const updateEmployee = async (input: UpdateEmployeeInput): Promise<Employee> => {
  try {
    // Build update object excluding undefined values
    const updateData: Partial<typeof employeesTable.$inferInsert> = {};
    
    if (input.fullName !== undefined) updateData.fullName = input.fullName;
    if (input.employeeId !== undefined) updateData.employeeId = input.employeeId;
    if (input.dateOfBirth !== undefined) updateData.dateOfBirth = input.dateOfBirth.toISOString().split('T')[0];
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.maritalStatus !== undefined) updateData.maritalStatus = input.maritalStatus;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.phoneNumber !== undefined) updateData.phoneNumber = input.phoneNumber;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.position !== undefined) updateData.position = input.position;
    if (input.department !== undefined) updateData.department = input.department;
    if (input.managerId !== undefined) updateData.managerId = input.managerId;
    if (input.startDate !== undefined) updateData.startDate = input.startDate.toISOString().split('T')[0];
    if (input.employmentStatus !== undefined) updateData.employmentStatus = input.employmentStatus;
    if (input.bankName !== undefined) updateData.bankName = input.bankName;
    if (input.bankAccountNumber !== undefined) updateData.bankAccountNumber = input.bankAccountNumber;
    if (input.role !== undefined) updateData.role = input.role;

    const result = await db.update(employeesTable)
      .set(updateData)
      .where(eq(employeesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Employee not found');
    }

    // Convert string dates back to Date objects
    const employee = result[0];
    return {
      ...employee,
      dateOfBirth: new Date(employee.dateOfBirth),
      startDate: new Date(employee.startDate)
    };
  } catch (error) {
    console.error('Employee update failed:', error);
    throw error;
  }
};

export const deleteEmployee = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(employeesTable)
      .where(eq(employeesTable.id, params.id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Employee deletion failed:', error);
    throw error;
  }
};

// Employee document handlers
export const createEmployeeDocument = async (input: CreateEmployeeDocumentInput): Promise<EmployeeDocument> => {
  try {
    // Verify employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.employeeId))
      .execute();

    if (employee.length === 0) {
      throw new Error('Employee not found');
    }

    const result = await db.insert(employeeDocumentsTable)
      .values({
        employeeId: input.employeeId,
        documentName: input.documentName,
        documentType: input.documentType,
        fileUrl: input.fileUrl
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Employee document creation failed:', error);
    throw error;
  }
};

export const getEmployeeDocuments = async (params: EmployeeIdParam): Promise<EmployeeDocument[]> => {
  try {
    const result = await db.select()
      .from(employeeDocumentsTable)
      .where(eq(employeeDocumentsTable.employeeId, params.employeeId))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch employee documents:', error);
    throw error;
  }
};

export const deleteEmployeeDocument = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(employeeDocumentsTable)
      .where(eq(employeeDocumentsTable.id, params.id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Employee document deletion failed:', error);
    throw error;
  }
};

// Department handlers
export const createDepartment = async (input: CreateDepartmentInput): Promise<Department> => {
  try {
    const result = await db.insert(departmentsTable)
      .values({
        name: input.name,
        description: input.description || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Department creation failed:', error);
    throw error;
  }
};

export const getDepartments = async (): Promise<Department[]> => {
  try {
    const result = await db.select()
      .from(departmentsTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch departments:', error);
    throw error;
  }
};

export const getDepartmentById = async (params: IdParam): Promise<Department | null> => {
  try {
    const result = await db.select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, params.id))
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Failed to fetch department by ID:', error);
    throw error;
  }
};

export const updateDepartment = async (input: UpdateDepartmentInput): Promise<Department> => {
  try {
    // Build update object excluding undefined values
    const updateData: Partial<typeof departmentsTable.$inferInsert> = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;

    const result = await db.update(departmentsTable)
      .set(updateData)
      .where(eq(departmentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Department not found');
    }

    return result[0];
  } catch (error) {
    console.error('Department update failed:', error);
    throw error;
  }
};

export const deleteDepartment = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(departmentsTable)
      .where(eq(departmentsTable.id, params.id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Department deletion failed:', error);
    throw error;
  }
};