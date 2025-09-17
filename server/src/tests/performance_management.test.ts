import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { employeesTable, performanceGoalsTable, performanceReviewsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  type CreatePerformanceGoalInput,
  type UpdatePerformanceGoalInput,
  type CreatePerformanceReviewInput,
  type IdParam,
  type EmployeeIdParam
} from '../schema';
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
} from '../handlers/performance_management';

describe('Performance Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test employees
  const createTestEmployee = async (employeeId: string, fullName: string) => {
    await db.insert(employeesTable).values({
      fullName,
      employeeId,
      dateOfBirth: '1990-01-01', // Use string format for date
      gender: 'Male',
      maritalStatus: 'Single',
      email: `${employeeId}@test.com`,
      startDate: '2023-01-01', // Use string format for date
      employmentStatus: 'Active',
      role: 'Employee'
    }).execute();
  };

  describe('Performance Goals', () => {
    const testGoalInput: CreatePerformanceGoalInput = {
      employeeId: 'EMP001',
      title: 'Complete Project Alpha',
      description: 'Successfully complete the Alpha project by Q1',
      dueDate: new Date('2025-03-31'), // Use a future date
      status: 'Not Started'
    };

    beforeEach(async () => {
      await createTestEmployee('EMP001', 'John Doe');
    });

    it('should create a performance goal', async () => {
      const result = await createPerformanceGoal(testGoalInput);

      expect(result.id).toBeDefined();
      expect(result.employeeId).toEqual('EMP001');
      expect(result.title).toEqual('Complete Project Alpha');
      expect(result.description).toEqual('Successfully complete the Alpha project by Q1');
      expect(result.dueDate).toEqual(new Date('2025-03-31'));
      expect(result.status).toEqual('Not Started');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save performance goal to database', async () => {
      const result = await createPerformanceGoal(testGoalInput);

      const goals = await db.select()
        .from(performanceGoalsTable)
        .where(eq(performanceGoalsTable.id, result.id))
        .execute();

      expect(goals).toHaveLength(1);
      expect(goals[0].title).toEqual('Complete Project Alpha');
      expect(goals[0].employeeId).toEqual('EMP001');
    });

    it('should throw error for non-existent employee', async () => {
      const invalidInput = { ...testGoalInput, employeeId: 'INVALID' };
      
      await expect(createPerformanceGoal(invalidInput)).rejects.toThrow(/Employee with ID INVALID not found/i);
    });

    it('should fetch all performance goals', async () => {
      await createPerformanceGoal(testGoalInput);
      
      const goals = await getPerformanceGoals();
      
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toEqual('Complete Project Alpha');
    });

    it('should fetch performance goals by employee', async () => {
      await createTestEmployee('EMP002', 'Jane Smith');
      
      await createPerformanceGoal(testGoalInput);
      await createPerformanceGoal({
        ...testGoalInput,
        employeeId: 'EMP002',
        title: 'Different Goal'
      });

      const goals = await getPerformanceGoalsByEmployee({ employeeId: 'EMP001' });
      
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toEqual('Complete Project Alpha');
      expect(goals[0].employeeId).toEqual('EMP001');
    });

    it('should fetch performance goal by ID', async () => {
      const created = await createPerformanceGoal(testGoalInput);
      
      const goal = await getPerformanceGoalById({ id: created.id });
      
      expect(goal).not.toBeNull();
      expect(goal!.title).toEqual('Complete Project Alpha');
    });

    it('should return null for non-existent goal ID', async () => {
      const goal = await getPerformanceGoalById({ id: 999 });
      
      expect(goal).toBeNull();
    });

    it('should update performance goal', async () => {
      const created = await createPerformanceGoal(testGoalInput);
      
      const updateInput: UpdatePerformanceGoalInput = {
        id: created.id,
        title: 'Updated Title',
        status: 'In Progress'
      };

      const updated = await updatePerformanceGoal(updateInput);
      
      expect(updated.title).toEqual('Updated Title');
      expect(updated.status).toEqual('In Progress');
      expect(updated.description).toEqual(testGoalInput.description || null); // unchanged
    });

    it('should throw error when updating non-existent goal', async () => {
      const updateInput: UpdatePerformanceGoalInput = {
        id: 999,
        title: 'Updated Title'
      };
      
      await expect(updatePerformanceGoal(updateInput)).rejects.toThrow(/Performance goal with ID 999 not found/i);
    });

    it('should delete performance goal', async () => {
      const created = await createPerformanceGoal(testGoalInput);
      
      const result = await deletePerformanceGoal({ id: created.id });
      
      expect(result.success).toBe(true);
      
      const goal = await getPerformanceGoalById({ id: created.id });
      expect(goal).toBeNull();
    });

    it('should fetch overdue goals', async () => {
      // Clear all existing goals first to isolate this test
      await db.delete(performanceGoalsTable).execute();
      
      const pastDue = new Date('2023-12-01'); // Past date

      // Use a unique employee for this test
      await createTestEmployee('EMP999', 'Test User for Overdue');

      // Create only one overdue goal
      await createPerformanceGoal({
        employeeId: 'EMP999',
        title: 'Single Overdue Goal',
        description: 'This goal is overdue',
        dueDate: pastDue,
        status: 'In Progress'
      });

      const overdueGoals = await getOverdueGoals();
      
      expect(overdueGoals).toHaveLength(1);
      expect(overdueGoals[0].title).toEqual('Single Overdue Goal');
    });

    it('should fetch goals by status', async () => {
      await createPerformanceGoal({
        ...testGoalInput,
        title: 'Goal 1',
        status: 'Not Started'
      });

      await createPerformanceGoal({
        ...testGoalInput,
        title: 'Goal 2',
        status: 'In Progress'
      });

      await createPerformanceGoal({
        ...testGoalInput,
        title: 'Goal 3',
        status: 'In Progress'
      });

      const inProgressGoals = await getGoalsByStatus({ status: 'In Progress' });
      
      expect(inProgressGoals).toHaveLength(2);
      inProgressGoals.forEach(goal => {
        expect(goal.status).toEqual('In Progress');
      });
    });
  });

  describe('Performance Reviews', () => {
    const testReviewInput: CreatePerformanceReviewInput = {
      employeeId: 'EMP001',
      reviewerId: 'EMP002',
      reviewDate: new Date('2024-01-15'),
      overallRating: 4,
      comments: 'Excellent performance this quarter'
    };

    beforeEach(async () => {
      await createTestEmployee('EMP001', 'John Doe');
      await createTestEmployee('EMP002', 'Jane Smith');
    });

    it('should create a performance review', async () => {
      const result = await createPerformanceReview(testReviewInput);

      expect(result.id).toBeDefined();
      expect(result.employeeId).toEqual('EMP001');
      expect(result.reviewerId).toEqual('EMP002');
      expect(result.reviewDate).toEqual(new Date('2024-01-15'));
      expect(result.overallRating).toEqual(4);
      expect(result.comments).toEqual('Excellent performance this quarter');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save performance review to database', async () => {
      const result = await createPerformanceReview(testReviewInput);

      const reviews = await db.select()
        .from(performanceReviewsTable)
        .where(eq(performanceReviewsTable.id, result.id))
        .execute();

      expect(reviews).toHaveLength(1);
      expect(reviews[0].overallRating).toEqual(4);
      expect(reviews[0].employeeId).toEqual('EMP001');
    });

    it('should throw error for non-existent employee', async () => {
      const invalidInput = { ...testReviewInput, employeeId: 'INVALID' };
      
      await expect(createPerformanceReview(invalidInput)).rejects.toThrow(/Employee with ID INVALID not found/i);
    });

    it('should throw error for non-existent reviewer', async () => {
      const invalidInput = { ...testReviewInput, reviewerId: 'INVALID' };
      
      await expect(createPerformanceReview(invalidInput)).rejects.toThrow(/Reviewer with ID INVALID not found/i);
    });

    it('should fetch all performance reviews', async () => {
      await createPerformanceReview(testReviewInput);
      
      const reviews = await getPerformanceReviews();
      
      expect(reviews).toHaveLength(1);
      expect(reviews[0].overallRating).toEqual(4);
    });

    it('should fetch performance reviews by employee', async () => {
      await createTestEmployee('EMP003', 'Bob Wilson');
      
      await createPerformanceReview(testReviewInput);
      await createPerformanceReview({
        ...testReviewInput,
        employeeId: 'EMP003',
        overallRating: 3
      });

      const reviews = await getPerformanceReviewsByEmployee({ employeeId: 'EMP001' });
      
      expect(reviews).toHaveLength(1);
      expect(reviews[0].employeeId).toEqual('EMP001');
      expect(reviews[0].overallRating).toEqual(4);
    });

    it('should fetch performance reviews by reviewer', async () => {
      await createTestEmployee('EMP003', 'Bob Wilson');
      
      await createPerformanceReview(testReviewInput);
      await createPerformanceReview({
        ...testReviewInput,
        reviewerId: 'EMP003',
        overallRating: 5
      });

      const reviews = await getPerformanceReviewsByReviewer({ reviewerId: 'EMP002' });
      
      expect(reviews).toHaveLength(1);
      expect(reviews[0].reviewerId).toEqual('EMP002');
      expect(reviews[0].overallRating).toEqual(4);
    });

    it('should fetch performance review by ID', async () => {
      const created = await createPerformanceReview(testReviewInput);
      
      const review = await getPerformanceReviewById({ id: created.id });
      
      expect(review).not.toBeNull();
      expect(review!.overallRating).toEqual(4);
    });

    it('should return null for non-existent review ID', async () => {
      const review = await getPerformanceReviewById({ id: 999 });
      
      expect(review).toBeNull();
    });

    it('should update performance review', async () => {
      const created = await createPerformanceReview(testReviewInput);
      
      const updateInput = {
        id: created.id,
        overallRating: 5,
        comments: 'Outstanding performance'
      };

      const updated = await updatePerformanceReview(updateInput);
      
      expect(updated.overallRating).toEqual(5);
      expect(updated.comments).toEqual('Outstanding performance');
      expect(updated.reviewDate).toEqual(testReviewInput.reviewDate); // unchanged
    });

    it('should throw error when updating non-existent review', async () => {
      const updateInput = {
        id: 999,
        overallRating: 5
      };
      
      await expect(updatePerformanceReview(updateInput)).rejects.toThrow(/Performance review with ID 999 not found/i);
    });

    it('should delete performance review', async () => {
      const created = await createPerformanceReview(testReviewInput);
      
      const result = await deletePerformanceReview({ id: created.id });
      
      expect(result.success).toBe(true);
      
      const review = await getPerformanceReviewById({ id: created.id });
      expect(review).toBeNull();
    });

    it('should calculate average rating by employee', async () => {
      // Create multiple reviews for the same employee
      await createPerformanceReview({ ...testReviewInput, overallRating: 4 });
      await createPerformanceReview({ 
        ...testReviewInput, 
        overallRating: 5,
        reviewDate: new Date('2024-02-15') 
      });
      await createPerformanceReview({ 
        ...testReviewInput, 
        overallRating: 3,
        reviewDate: new Date('2024-03-15') 
      });

      const result = await getAverageRatingByEmployee({ employeeId: 'EMP001' });
      
      expect(result.averageRating).toEqual(4); // (4 + 5 + 3) / 3 = 4
    });

    it('should return 0 for employee with no reviews', async () => {
      const result = await getAverageRatingByEmployee({ employeeId: 'EMP001' });
      
      expect(result.averageRating).toEqual(0);
    });

    it('should handle decimal average ratings', async () => {
      await createPerformanceReview({ ...testReviewInput, overallRating: 4 });
      await createPerformanceReview({ 
        ...testReviewInput, 
        overallRating: 5,
        reviewDate: new Date('2024-02-15') 
      });

      const result = await getAverageRatingByEmployee({ employeeId: 'EMP001' });
      
      expect(result.averageRating).toEqual(4.5); // (4 + 5) / 2 = 4.5
    });
  });
});