import { db } from '../db';
import { performanceGoalsTable, performanceReviewsTable, employeesTable } from '../db/schema';
import { 
  type PerformanceGoal, 
  type CreatePerformanceGoalInput, 
  type UpdatePerformanceGoalInput,
  type PerformanceReview,
  type CreatePerformanceReviewInput,
  type IdParam,
  type EmployeeIdParam
} from '../schema';
import { eq, and, lt, ne, avg, isNotNull, SQL } from 'drizzle-orm';

// Performance goal handlers
export const createPerformanceGoal = async (input: CreatePerformanceGoalInput): Promise<PerformanceGoal> => {
  try {
    // Verify employee exists
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.employeeId))
      .execute();
    
    if (employee.length === 0) {
      throw new Error(`Employee with ID ${input.employeeId} not found`);
    }

    const result = await db.insert(performanceGoalsTable)
      .values({
        employeeId: input.employeeId,
        title: input.title,
        description: input.description || null,
        dueDate: input.dueDate ? input.dueDate.toISOString().split('T')[0] : null,
        status: input.status
      })
      .returning()
      .execute();

    const goal = result[0];
    return {
      ...goal,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : null
    };
  } catch (error) {
    console.error('Performance goal creation failed:', error);
    throw error;
  }
};

export const getPerformanceGoals = async (): Promise<PerformanceGoal[]> => {
  try {
    const results = await db.select()
      .from(performanceGoalsTable)
      .execute();

    return results.map(goal => ({
      ...goal,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : null
    }));
  } catch (error) {
    console.error('Failed to fetch performance goals:', error);
    throw error;
  }
};

export const getPerformanceGoalsByEmployee = async (params: EmployeeIdParam): Promise<PerformanceGoal[]> => {
  try {
    const results = await db.select()
      .from(performanceGoalsTable)
      .where(eq(performanceGoalsTable.employeeId, params.employeeId))
      .execute();

    return results.map(goal => ({
      ...goal,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : null
    }));
  } catch (error) {
    console.error('Failed to fetch performance goals by employee:', error);
    throw error;
  }
};

export const getPerformanceGoalById = async (params: IdParam): Promise<PerformanceGoal | null> => {
  try {
    const results = await db.select()
      .from(performanceGoalsTable)
      .where(eq(performanceGoalsTable.id, params.id))
      .execute();

    const goal = results[0];
    if (!goal) return null;
    
    return {
      ...goal,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : null
    };
  } catch (error) {
    console.error('Failed to fetch performance goal by ID:', error);
    throw error;
  }
};

export const updatePerformanceGoal = async (input: UpdatePerformanceGoalInput): Promise<PerformanceGoal> => {
  try {
    // Check if goal exists
    const existing = await db.select()
      .from(performanceGoalsTable)
      .where(eq(performanceGoalsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Performance goal with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? input.dueDate.toISOString().split('T')[0] : null;
    if (input.status !== undefined) updateData.status = input.status;

    const results = await db.update(performanceGoalsTable)
      .set(updateData)
      .where(eq(performanceGoalsTable.id, input.id))
      .returning()
      .execute();

    const goal = results[0];
    return {
      ...goal,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : null
    };
  } catch (error) {
    console.error('Performance goal update failed:', error);
    throw error;
  }
};

export const deletePerformanceGoal = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(performanceGoalsTable)
      .where(eq(performanceGoalsTable.id, params.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Performance goal deletion failed:', error);
    throw error;
  }
};

export const getOverdueGoals = async (): Promise<PerformanceGoal[]> => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD string
    
    const results = await db.select()
      .from(performanceGoalsTable)
      .where(
        and(
          isNotNull(performanceGoalsTable.dueDate), // Only goals with due dates
          lt(performanceGoalsTable.dueDate, today),
          ne(performanceGoalsTable.status, 'Completed')
        )
      )
      .execute();

    return results.map(goal => ({
      ...goal,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : null
    }));
  } catch (error) {
    console.error('Failed to fetch overdue goals:', error);
    throw error;
  }
};

export const getGoalsByStatus = async (params: { 
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Canceled' 
}): Promise<PerformanceGoal[]> => {
  try {
    const results = await db.select()
      .from(performanceGoalsTable)
      .where(eq(performanceGoalsTable.status, params.status))
      .execute();

    return results.map(goal => ({
      ...goal,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : null
    }));
  } catch (error) {
    console.error('Failed to fetch goals by status:', error);
    throw error;
  }
};

// Performance review handlers
export const createPerformanceReview = async (input: CreatePerformanceReviewInput): Promise<PerformanceReview> => {
  try {
    // Verify both employee and reviewer exist
    const employee = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.employeeId))
      .execute();
    
    if (employee.length === 0) {
      throw new Error(`Employee with ID ${input.employeeId} not found`);
    }

    const reviewer = await db.select()
      .from(employeesTable)
      .where(eq(employeesTable.employeeId, input.reviewerId))
      .execute();
    
    if (reviewer.length === 0) {
      throw new Error(`Reviewer with ID ${input.reviewerId} not found`);
    }

    const result = await db.insert(performanceReviewsTable)
      .values({
        employeeId: input.employeeId,
        reviewerId: input.reviewerId,
        reviewDate: input.reviewDate.toISOString().split('T')[0],
        overallRating: input.overallRating,
        comments: input.comments || null
      })
      .returning()
      .execute();

    const review = result[0];
    return {
      ...review,
      reviewDate: new Date(review.reviewDate)
    };
  } catch (error) {
    console.error('Performance review creation failed:', error);
    throw error;
  }
};

export const getPerformanceReviews = async (): Promise<PerformanceReview[]> => {
  try {
    const results = await db.select()
      .from(performanceReviewsTable)
      .execute();

    return results.map(review => ({
      ...review,
      reviewDate: new Date(review.reviewDate)
    }));
  } catch (error) {
    console.error('Failed to fetch performance reviews:', error);
    throw error;
  }
};

export const getPerformanceReviewsByEmployee = async (params: EmployeeIdParam): Promise<PerformanceReview[]> => {
  try {
    const results = await db.select()
      .from(performanceReviewsTable)
      .where(eq(performanceReviewsTable.employeeId, params.employeeId))
      .execute();

    return results.map(review => ({
      ...review,
      reviewDate: new Date(review.reviewDate)
    }));
  } catch (error) {
    console.error('Failed to fetch performance reviews by employee:', error);
    throw error;
  }
};

export const getPerformanceReviewsByReviewer = async (params: { reviewerId: string }): Promise<PerformanceReview[]> => {
  try {
    const results = await db.select()
      .from(performanceReviewsTable)
      .where(eq(performanceReviewsTable.reviewerId, params.reviewerId))
      .execute();

    return results.map(review => ({
      ...review,
      reviewDate: new Date(review.reviewDate)
    }));
  } catch (error) {
    console.error('Failed to fetch performance reviews by reviewer:', error);
    throw error;
  }
};

export const getPerformanceReviewById = async (params: IdParam): Promise<PerformanceReview | null> => {
  try {
    const results = await db.select()
      .from(performanceReviewsTable)
      .where(eq(performanceReviewsTable.id, params.id))
      .execute();

    const review = results[0];
    if (!review) return null;
    
    return {
      ...review,
      reviewDate: new Date(review.reviewDate)
    };
  } catch (error) {
    console.error('Failed to fetch performance review by ID:', error);
    throw error;
  }
};

export const updatePerformanceReview = async (input: {
  id: number;
  reviewDate?: Date;
  overallRating?: number;
  comments?: string | null;
}): Promise<PerformanceReview> => {
  try {
    // Check if review exists
    const existing = await db.select()
      .from(performanceReviewsTable)
      .where(eq(performanceReviewsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Performance review with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.reviewDate !== undefined) updateData.reviewDate = input.reviewDate.toISOString().split('T')[0];
    if (input.overallRating !== undefined) updateData.overallRating = input.overallRating;
    if (input.comments !== undefined) updateData.comments = input.comments;

    const results = await db.update(performanceReviewsTable)
      .set(updateData)
      .where(eq(performanceReviewsTable.id, input.id))
      .returning()
      .execute();

    const review = results[0];
    return {
      ...review,
      reviewDate: new Date(review.reviewDate)
    };
  } catch (error) {
    console.error('Performance review update failed:', error);
    throw error;
  }
};

export const deletePerformanceReview = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(performanceReviewsTable)
      .where(eq(performanceReviewsTable.id, params.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Performance review deletion failed:', error);
    throw error;
  }
};

export const getAverageRatingByEmployee = async (params: EmployeeIdParam): Promise<{ averageRating: number }> => {
  try {
    const result = await db.select({
      averageRating: avg(performanceReviewsTable.overallRating)
    })
      .from(performanceReviewsTable)
      .where(eq(performanceReviewsTable.employeeId, params.employeeId))
      .execute();

    const avgRating = result[0]?.averageRating;
    return { 
      averageRating: avgRating ? parseFloat(avgRating.toString()) : 0 
    };
  } catch (error) {
    console.error('Failed to calculate average rating:', error);
    throw error;
  }
};