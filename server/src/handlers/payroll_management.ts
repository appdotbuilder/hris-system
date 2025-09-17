import { db } from '../db';
import { 
  payrollComponentsTable, 
  employeeSalaryStructureTable, 
  payslipsTable,
  employeesTable 
} from '../db/schema';
import { 
  type PayrollComponent, 
  type CreatePayrollComponentInput,
  type EmployeeSalaryStructure,
  type CreateEmployeeSalaryStructureInput,
  type Payslip,
  type CreatePayslipInput,
  type IdParam,
  type EmployeeIdParam
} from '../schema';
import { eq, and, desc } from 'drizzle-orm';

// Helper function to convert Date to string format for date columns
const dateToString = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Helper function to convert payslip DB result to proper types
const convertPayslipResult = (payslip: any): Payslip => ({
  ...payslip,
  payPeriodStart: new Date(payslip.payPeriodStart), // Convert string to Date
  payPeriodEnd: new Date(payslip.payPeriodEnd), // Convert string to Date
  grossSalary: parseFloat(payslip.grossSalary), // Convert strings back to numbers
  totalAllowances: parseFloat(payslip.totalAllowances),
  totalDeductions: parseFloat(payslip.totalDeductions),
  netSalary: parseFloat(payslip.netSalary)
});

// Payroll component handlers
export const createPayrollComponent = async (input: CreatePayrollComponentInput): Promise<PayrollComponent> => {
  try {
    const result = await db.insert(payrollComponentsTable)
      .values({
        name: input.name,
        type: input.type,
        amount: input.amount.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const component = result[0];
    return {
      ...component,
      amount: parseFloat(component.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payroll component creation failed:', error);
    throw error;
  }
};

export const getPayrollComponents = async (): Promise<PayrollComponent[]> => {
  try {
    const results = await db.select()
      .from(payrollComponentsTable)
      .orderBy(desc(payrollComponentsTable.created_at))
      .execute();

    return results.map(component => ({
      ...component,
      amount: parseFloat(component.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch payroll components:', error);
    throw error;
  }
};

export const getPayrollComponentById = async (params: IdParam): Promise<PayrollComponent | null> => {
  try {
    const results = await db.select()
      .from(payrollComponentsTable)
      .where(eq(payrollComponentsTable.id, params.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const component = results[0];
    return {
      ...component,
      amount: parseFloat(component.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to fetch payroll component by ID:', error);
    throw error;
  }
};

export const updatePayrollComponent = async (input: {
  id: number;
  name?: string;
  type?: 'Allowance' | 'Deduction';
  amount?: number;
}): Promise<PayrollComponent> => {
  try {
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.amount !== undefined) updateData.amount = input.amount.toString(); // Convert number to string

    const result = await db.update(payrollComponentsTable)
      .set(updateData)
      .where(eq(payrollComponentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Payroll component not found');
    }

    const component = result[0];
    return {
      ...component,
      amount: parseFloat(component.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payroll component update failed:', error);
    throw error;
  }
};

export const deletePayrollComponent = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(payrollComponentsTable)
      .where(eq(payrollComponentsTable.id, params.id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Payroll component deletion failed:', error);
    throw error;
  }
};

// Employee salary structure handlers
export const createEmployeeSalaryStructure = async (input: CreateEmployeeSalaryStructureInput): Promise<EmployeeSalaryStructure> => {
  try {
    // Verify employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.employeeId))
      .execute();

    if (employee.length === 0) {
      throw new Error('Employee not found');
    }

    // Verify payroll component exists
    const component = await db.select()
      .from(payrollComponentsTable)
      .where(eq(payrollComponentsTable.id, input.componentId))
      .execute();

    if (component.length === 0) {
      throw new Error('Payroll component not found');
    }

    const result = await db.insert(employeeSalaryStructureTable)
      .values({
        employeeId: input.employeeId,
        componentId: input.componentId,
        amount: input.amount.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const salaryStructure = result[0];
    return {
      ...salaryStructure,
      amount: parseFloat(salaryStructure.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Employee salary structure creation failed:', error);
    throw error;
  }
};

export const getEmployeeSalaryStructure = async (params: EmployeeIdParam): Promise<EmployeeSalaryStructure[]> => {
  try {
    const results = await db.select()
      .from(employeeSalaryStructureTable)
      .where(eq(employeeSalaryStructureTable.employeeId, params.employeeId))
      .orderBy(desc(employeeSalaryStructureTable.created_at))
      .execute();

    return results.map(structure => ({
      ...structure,
      amount: parseFloat(structure.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch employee salary structure:', error);
    throw error;
  }
};

export const updateEmployeeSalaryStructure = async (input: {
  id: number;
  amount: number;
}): Promise<EmployeeSalaryStructure> => {
  try {
    const result = await db.update(employeeSalaryStructureTable)
      .set({
        amount: input.amount.toString() // Convert number to string for numeric column
      })
      .where(eq(employeeSalaryStructureTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Employee salary structure not found');
    }

    const structure = result[0];
    return {
      ...structure,
      amount: parseFloat(structure.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Employee salary structure update failed:', error);
    throw error;
  }
};

export const deleteEmployeeSalaryStructure = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(employeeSalaryStructureTable)
      .where(eq(employeeSalaryStructureTable.id, params.id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Employee salary structure deletion failed:', error);
    throw error;
  }
};

// Payslip handlers
export const createPayslip = async (input: CreatePayslipInput): Promise<Payslip> => {
  try {
    // Verify employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.employeeId))
      .execute();

    if (employee.length === 0) {
      throw new Error('Employee not found');
    }

    const result = await db.insert(payslipsTable)
      .values({
        employeeId: input.employeeId,
        payPeriodStart: dateToString(input.payPeriodStart), // Convert Date to string
        payPeriodEnd: dateToString(input.payPeriodEnd), // Convert Date to string
        grossSalary: input.grossSalary.toString(), // Convert number to string for numeric column
        totalAllowances: input.totalAllowances.toString(),
        totalDeductions: input.totalDeductions.toString(),
        netSalary: input.netSalary.toString()
      })
      .returning()
      .execute();

    const payslip = result[0];
    return convertPayslipResult(payslip);
  } catch (error) {
    console.error('Payslip creation failed:', error);
    throw error;
  }
};

export const generatePayslip = async (params: {
  employeeId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
}): Promise<Payslip> => {
  try {
    // Verify employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, params.employeeId))
      .execute();

    if (employee.length === 0) {
      throw new Error('Employee not found');
    }

    // Get employee's salary structure with component details
    const salaryComponents = await db.select({
      id: employeeSalaryStructureTable.id,
      employeeId: employeeSalaryStructureTable.employeeId,
      componentId: employeeSalaryStructureTable.componentId,
      amount: employeeSalaryStructureTable.amount,
      created_at: employeeSalaryStructureTable.created_at,
      componentType: payrollComponentsTable.type,
      componentName: payrollComponentsTable.name
    })
      .from(employeeSalaryStructureTable)
      .innerJoin(payrollComponentsTable, eq(employeeSalaryStructureTable.componentId, payrollComponentsTable.id))
      .where(eq(employeeSalaryStructureTable.employeeId, params.employeeId))
      .execute();

    if (salaryComponents.length === 0) {
      throw new Error('No salary structure found for employee');
    }

    // Calculate totals
    let grossSalary = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;

    salaryComponents.forEach(component => {
      const amount = parseFloat(component.amount);
      if (component.componentType === 'Allowance') {
        totalAllowances += amount;
        grossSalary += amount;
      } else if (component.componentType === 'Deduction') {
        totalDeductions += amount;
      }
    });

    const netSalary = grossSalary - totalDeductions;

    // Create the payslip
    const payslipInput: CreatePayslipInput = {
      employeeId: params.employeeId,
      payPeriodStart: params.payPeriodStart,
      payPeriodEnd: params.payPeriodEnd,
      grossSalary,
      totalAllowances,
      totalDeductions,
      netSalary
    };

    return await createPayslip(payslipInput);
  } catch (error) {
    console.error('Payslip generation failed:', error);
    throw error;
  }
};

export const getPayslips = async (): Promise<Payslip[]> => {
  try {
    const results = await db.select()
      .from(payslipsTable)
      .orderBy(desc(payslipsTable.created_at))
      .execute();

    return results.map(convertPayslipResult);
  } catch (error) {
    console.error('Failed to fetch payslips:', error);
    throw error;
  }
};

export const getPayslipsByEmployee = async (params: EmployeeIdParam): Promise<Payslip[]> => {
  try {
    const results = await db.select()
      .from(payslipsTable)
      .where(eq(payslipsTable.employeeId, params.employeeId))
      .orderBy(desc(payslipsTable.created_at))
      .execute();

    return results.map(convertPayslipResult);
  } catch (error) {
    console.error('Failed to fetch payslips by employee:', error);
    throw error;
  }
};

export const getPayslipById = async (params: IdParam): Promise<Payslip | null> => {
  try {
    const results = await db.select()
      .from(payslipsTable)
      .where(eq(payslipsTable.id, params.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const payslip = results[0];
    return convertPayslipResult(payslip);
  } catch (error) {
    console.error('Failed to fetch payslip by ID:', error);
    throw error;
  }
};

export const generateMonthlyPayslips = async (params: {
  year: number;
  month: number;
}): Promise<Payslip[]> => {
  try {
    // Get all active employees
    const activeEmployees = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employmentStatus, 'Active'))
      .execute();

    if (activeEmployees.length === 0) {
      return [];
    }

    // Calculate pay period dates (first to last day of month)
    const payPeriodStart = new Date(params.year, params.month - 1, 1);
    const payPeriodEnd = new Date(params.year, params.month, 0); // Last day of the month

    const generatedPayslips: Payslip[] = [];

    // Generate payslip for each active employee
    for (const employee of activeEmployees) {
      try {
        // Check if payslip already exists for this period
        const existingPayslips = await db.select()
          .from(payslipsTable)
          .where(
            and(
              eq(payslipsTable.employeeId, employee.employeeId),
              eq(payslipsTable.payPeriodStart, dateToString(payPeriodStart)), // Convert Date to string
              eq(payslipsTable.payPeriodEnd, dateToString(payPeriodEnd)) // Convert Date to string
            )
          )
          .execute();

        if (existingPayslips.length > 0) {
          // Payslip already exists, add to results
          const payslip = existingPayslips[0];
          generatedPayslips.push(convertPayslipResult(payslip));
          continue;
        }

        // Generate new payslip
        const payslip = await generatePayslip({
          employeeId: employee.employeeId,
          payPeriodStart,
          payPeriodEnd
        });

        generatedPayslips.push(payslip);
      } catch (employeeError) {
        // Log error for individual employee but continue with others
        console.error(`Failed to generate payslip for employee ${employee.employeeId}:`, employeeError);
        continue;
      }
    }

    return generatedPayslips;
  } catch (error) {
    console.error('Monthly payslip generation failed:', error);
    throw error;
  }
};