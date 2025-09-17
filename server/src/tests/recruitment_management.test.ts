import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { departmentsTable, jobVacanciesTable, applicantsTable } from '../db/schema';
import { 
  type CreateJobVacancyInput, 
  type UpdateJobVacancyInput,
  type CreateApplicantInput,
  type UpdateApplicantStatusInput
} from '../schema';
import {
  createJobVacancy,
  getJobVacancies,
  getOpenJobVacancies,
  getJobVacancyById,
  updateJobVacancy,
  deleteJobVacancy,
  closeJobVacancy,
  getJobVacanciesByDepartment,
  createApplicant,
  getApplicants,
  getApplicantsByJobVacancy,
  getApplicantById,
  updateApplicantStatus,
  deleteApplicant,
  getApplicantsByStatus,
  searchApplicants,
  getRecruitmentStatistics
} from '../handlers/recruitment_management';
import { eq } from 'drizzle-orm';

// Test data
const testJobVacancyInput: CreateJobVacancyInput = {
  title: 'Software Engineer',
  description: 'We are looking for a skilled software engineer to join our development team.',
  departmentId: null,
  status: 'Open',
  postedDate: new Date('2024-01-15')
};

const testApplicantInput: CreateApplicantInput = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phoneNumber: '555-0123',
  resumeUrl: 'https://example.com/resume.pdf',
  jobVacancyId: 0, // Will be set after creating job vacancy
  applicationDate: new Date('2024-01-20'),
  status: 'Applied'
};

describe('Job Vacancy Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createJobVacancy', () => {
    it('should create a job vacancy without department', async () => {
      const result = await createJobVacancy(testJobVacancyInput);

      expect(result.id).toBeDefined();
      expect(result.title).toEqual('Software Engineer');
      expect(result.description).toEqual(testJobVacancyInput.description);
      expect(result.departmentId).toBeNull();
      expect(result.status).toEqual('Open');
      expect(result.postedDate).toEqual(testJobVacancyInput.postedDate);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a job vacancy with department', async () => {
      // Create department first
      const departmentResult = await db.insert(departmentsTable)
        .values({
          name: 'Engineering',
          description: 'Development team'
        })
        .returning()
        .execute();

      const inputWithDepartment: CreateJobVacancyInput = {
        ...testJobVacancyInput,
        departmentId: departmentResult[0].id
      };

      const result = await createJobVacancy(inputWithDepartment);

      expect(result.departmentId).toEqual(departmentResult[0].id);
    });

    it('should throw error when department does not exist', async () => {
      const inputWithInvalidDepartment: CreateJobVacancyInput = {
        ...testJobVacancyInput,
        departmentId: 999
      };

      await expect(createJobVacancy(inputWithInvalidDepartment)).rejects.toThrow(/department not found/i);
    });

    it('should save job vacancy to database', async () => {
      const result = await createJobVacancy(testJobVacancyInput);

      const jobVacancies = await db.select()
        .from(jobVacanciesTable)
        .where(eq(jobVacanciesTable.id, result.id))
        .execute();

      expect(jobVacancies).toHaveLength(1);
      expect(jobVacancies[0].title).toEqual('Software Engineer');
    });
  });

  describe('getJobVacancies', () => {
    it('should return all job vacancies', async () => {
      await createJobVacancy(testJobVacancyInput);
      await createJobVacancy({
        ...testJobVacancyInput,
        title: 'Product Manager',
        status: 'Closed'
      });

      const result = await getJobVacancies();

      expect(result).toHaveLength(2);
      expect(result.map(v => v.title)).toContain('Software Engineer');
      expect(result.map(v => v.title)).toContain('Product Manager');
    });

    it('should return empty array when no job vacancies exist', async () => {
      const result = await getJobVacancies();

      expect(result).toHaveLength(0);
    });
  });

  describe('getOpenJobVacancies', () => {
    it('should return only open job vacancies', async () => {
      await createJobVacancy(testJobVacancyInput);
      await createJobVacancy({
        ...testJobVacancyInput,
        title: 'Product Manager',
        status: 'Closed'
      });

      const result = await getOpenJobVacancies();

      expect(result).toHaveLength(1);
      expect(result[0].title).toEqual('Software Engineer');
      expect(result[0].status).toEqual('Open');
    });
  });

  describe('getJobVacancyById', () => {
    it('should return job vacancy when found', async () => {
      const created = await createJobVacancy(testJobVacancyInput);

      const result = await getJobVacancyById({ id: created.id });

      expect(result).toBeDefined();
      expect(result?.title).toEqual('Software Engineer');
    });

    it('should return null when job vacancy not found', async () => {
      const result = await getJobVacancyById({ id: 999 });

      expect(result).toBeNull();
    });
  });

  describe('updateJobVacancy', () => {
    it('should update job vacancy successfully', async () => {
      const created = await createJobVacancy(testJobVacancyInput);

      const updateInput: UpdateJobVacancyInput = {
        id: created.id,
        title: 'Senior Software Engineer',
        status: 'Closed'
      };

      const result = await updateJobVacancy(updateInput);

      expect(result.title).toEqual('Senior Software Engineer');
      expect(result.status).toEqual('Closed');
      expect(result.description).toEqual(testJobVacancyInput.description); // Should remain unchanged
    });

    it('should throw error when job vacancy not found', async () => {
      const updateInput: UpdateJobVacancyInput = {
        id: 999,
        title: 'Updated Title'
      };

      await expect(updateJobVacancy(updateInput)).rejects.toThrow(/job vacancy not found/i);
    });

    it('should throw error when updating with invalid department', async () => {
      const created = await createJobVacancy(testJobVacancyInput);

      const updateInput: UpdateJobVacancyInput = {
        id: created.id,
        departmentId: 999
      };

      await expect(updateJobVacancy(updateInput)).rejects.toThrow(/department not found/i);
    });
  });

  describe('deleteJobVacancy', () => {
    it('should delete job vacancy successfully', async () => {
      const created = await createJobVacancy(testJobVacancyInput);

      const result = await deleteJobVacancy({ id: created.id });

      expect(result.success).toBe(true);

      const found = await getJobVacancyById({ id: created.id });
      expect(found).toBeNull();
    });

    it('should throw error when job vacancy not found', async () => {
      await expect(deleteJobVacancy({ id: 999 })).rejects.toThrow(/job vacancy not found/i);
    });

    it('should throw error when job vacancy has applicants', async () => {
      const jobVacancy = await createJobVacancy(testJobVacancyInput);
      await createApplicant({
        ...testApplicantInput,
        jobVacancyId: jobVacancy.id
      });

      await expect(deleteJobVacancy({ id: jobVacancy.id })).rejects.toThrow(/cannot delete job vacancy with existing applicants/i);
    });
  });

  describe('closeJobVacancy', () => {
    it('should close job vacancy successfully', async () => {
      const created = await createJobVacancy(testJobVacancyInput);

      const result = await closeJobVacancy({ id: created.id });

      expect(result.status).toEqual('Closed');
    });

    it('should throw error when job vacancy not found', async () => {
      await expect(closeJobVacancy({ id: 999 })).rejects.toThrow(/job vacancy not found/i);
    });
  });

  describe('getJobVacanciesByDepartment', () => {
    it('should return job vacancies for specific department', async () => {
      // Create department
      const departmentResult = await db.insert(departmentsTable)
        .values({
          name: 'Engineering',
          description: 'Development team'
        })
        .returning()
        .execute();

      // Create job vacancies
      await createJobVacancy({
        ...testJobVacancyInput,
        departmentId: departmentResult[0].id
      });
      await createJobVacancy(testJobVacancyInput); // No department

      const result = await getJobVacanciesByDepartment({ departmentId: departmentResult[0].id });

      expect(result).toHaveLength(1);
      expect(result[0].departmentId).toEqual(departmentResult[0].id);
    });

    it('should throw error when department not found', async () => {
      await expect(getJobVacanciesByDepartment({ departmentId: 999 })).rejects.toThrow(/department not found/i);
    });
  });
});

describe('Applicant Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testJobVacancyId: number;

  beforeEach(async () => {
    const jobVacancy = await createJobVacancy(testJobVacancyInput);
    testJobVacancyId = jobVacancy.id;
  });

  describe('createApplicant', () => {
    it('should create an applicant successfully', async () => {
      const inputWithJobVacancy: CreateApplicantInput = {
        ...testApplicantInput,
        jobVacancyId: testJobVacancyId
      };

      const result = await createApplicant(inputWithJobVacancy);

      expect(result.id).toBeDefined();
      expect(result.fullName).toEqual('John Doe');
      expect(result.email).toEqual('john.doe@example.com');
      expect(result.phoneNumber).toEqual('555-0123');
      expect(result.resumeUrl).toEqual('https://example.com/resume.pdf');
      expect(result.jobVacancyId).toEqual(testJobVacancyId);
      expect(result.status).toEqual('Applied');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create applicant with optional fields as null', async () => {
      const minimalInput: CreateApplicantInput = {
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        jobVacancyId: testJobVacancyId,
        applicationDate: new Date('2024-01-21'),
        status: 'Applied'
      };

      const result = await createApplicant(minimalInput);

      expect(result.phoneNumber).toBeNull();
      expect(result.resumeUrl).toBeNull();
    });

    it('should throw error when job vacancy does not exist', async () => {
      const inputWithInvalidJobVacancy: CreateApplicantInput = {
        ...testApplicantInput,
        jobVacancyId: 999
      };

      await expect(createApplicant(inputWithInvalidJobVacancy)).rejects.toThrow(/job vacancy not found/i);
    });
  });

  describe('getApplicants', () => {
    it('should return all applicants', async () => {
      await createApplicant({
        ...testApplicantInput,
        jobVacancyId: testJobVacancyId
      });
      await createApplicant({
        ...testApplicantInput,
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        jobVacancyId: testJobVacancyId
      });

      const result = await getApplicants();

      expect(result).toHaveLength(2);
      expect(result.map(a => a.fullName)).toContain('John Doe');
      expect(result.map(a => a.fullName)).toContain('Jane Smith');
    });

    it('should return empty array when no applicants exist', async () => {
      const result = await getApplicants();

      expect(result).toHaveLength(0);
    });
  });

  describe('getApplicantsByJobVacancy', () => {
    it('should return applicants for specific job vacancy', async () => {
      // Create second job vacancy
      const jobVacancy2 = await createJobVacancy({
        ...testJobVacancyInput,
        title: 'Product Manager'
      });

      // Create applicants for different job vacancies
      await createApplicant({
        ...testApplicantInput,
        jobVacancyId: testJobVacancyId
      });
      await createApplicant({
        ...testApplicantInput,
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        jobVacancyId: jobVacancy2.id
      });

      const result = await getApplicantsByJobVacancy({ jobVacancyId: testJobVacancyId });

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toEqual('John Doe');
      expect(result[0].jobVacancyId).toEqual(testJobVacancyId);
    });

    it('should throw error when job vacancy not found', async () => {
      await expect(getApplicantsByJobVacancy({ jobVacancyId: 999 })).rejects.toThrow(/job vacancy not found/i);
    });
  });

  describe('getApplicantById', () => {
    it('should return applicant when found', async () => {
      const created = await createApplicant({
        ...testApplicantInput,
        jobVacancyId: testJobVacancyId
      });

      const result = await getApplicantById({ id: created.id });

      expect(result).toBeDefined();
      expect(result?.fullName).toEqual('John Doe');
    });

    it('should return null when applicant not found', async () => {
      const result = await getApplicantById({ id: 999 });

      expect(result).toBeNull();
    });
  });

  describe('updateApplicantStatus', () => {
    it('should update applicant status successfully', async () => {
      const created = await createApplicant({
        ...testApplicantInput,
        jobVacancyId: testJobVacancyId
      });

      const updateInput: UpdateApplicantStatusInput = {
        id: created.id,
        status: 'Interview'
      };

      const result = await updateApplicantStatus(updateInput);

      expect(result.status).toEqual('Interview');
      expect(result.fullName).toEqual('John Doe'); // Should remain unchanged
    });

    it('should throw error when applicant not found', async () => {
      const updateInput: UpdateApplicantStatusInput = {
        id: 999,
        status: 'Interview'
      };

      await expect(updateApplicantStatus(updateInput)).rejects.toThrow(/applicant not found/i);
    });
  });

  describe('deleteApplicant', () => {
    it('should delete applicant successfully', async () => {
      const created = await createApplicant({
        ...testApplicantInput,
        jobVacancyId: testJobVacancyId
      });

      const result = await deleteApplicant({ id: created.id });

      expect(result.success).toBe(true);

      const found = await getApplicantById({ id: created.id });
      expect(found).toBeNull();
    });

    it('should throw error when applicant not found', async () => {
      await expect(deleteApplicant({ id: 999 })).rejects.toThrow(/applicant not found/i);
    });
  });

  describe('getApplicantsByStatus', () => {
    it('should return applicants with specific status', async () => {
      await createApplicant({
        ...testApplicantInput,
        jobVacancyId: testJobVacancyId,
        status: 'Applied'
      });
      await createApplicant({
        ...testApplicantInput,
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        jobVacancyId: testJobVacancyId,
        status: 'Interview'
      });

      const result = await getApplicantsByStatus({ status: 'Applied' });

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toEqual('John Doe');
      expect(result[0].status).toEqual('Applied');
    });
  });

  describe('searchApplicants', () => {
    beforeEach(async () => {
      await createApplicant({
        ...testApplicantInput,
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        jobVacancyId: testJobVacancyId
      });
      await createApplicant({
        ...testApplicantInput,
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        jobVacancyId: testJobVacancyId
      });
    });

    it('should search applicants by name', async () => {
      const result = await searchApplicants({ searchTerm: 'John' });

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toEqual('John Doe');
    });

    it('should search applicants by email', async () => {
      const result = await searchApplicants({ searchTerm: 'jane.smith' });

      expect(result).toHaveLength(1);
      expect(result[0].email).toEqual('jane.smith@example.com');
    });

    it('should return empty array when no matches found', async () => {
      const result = await searchApplicants({ searchTerm: 'nonexistent' });

      expect(result).toHaveLength(0);
    });

    it('should be case insensitive', async () => {
      const result = await searchApplicants({ searchTerm: 'JOHN' });

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toEqual('John Doe');
    });
  });

  describe('getRecruitmentStatistics', () => {
    beforeEach(async () => {
      // Create additional job vacancy
      await createJobVacancy({
        ...testJobVacancyInput,
        title: 'Product Manager',
        status: 'Closed'
      });

      // Create applicants with different statuses
      await createApplicant({
        ...testApplicantInput,
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        jobVacancyId: testJobVacancyId,
        status: 'Applied'
      });
      await createApplicant({
        ...testApplicantInput,
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        jobVacancyId: testJobVacancyId,
        status: 'Interview'
      });
      await createApplicant({
        ...testApplicantInput,
        fullName: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        jobVacancyId: testJobVacancyId,
        status: 'Applied'
      });
    });

    it('should return accurate recruitment statistics', async () => {
      const result = await getRecruitmentStatistics();

      expect(result.totalVacancies).toEqual(2);
      expect(result.openVacancies).toEqual(1);
      expect(result.totalApplicants).toEqual(3);
      expect(result.applicantsByStatus['Applied']).toEqual(2);
      expect(result.applicantsByStatus['Interview']).toEqual(1);
    });

    it('should return zero statistics when no data exists', async () => {
      // Clear all data
      await db.delete(applicantsTable).execute();
      await db.delete(jobVacanciesTable).execute();

      const result = await getRecruitmentStatistics();

      expect(result.totalVacancies).toEqual(0);
      expect(result.openVacancies).toEqual(0);
      expect(result.totalApplicants).toEqual(0);
      expect(Object.keys(result.applicantsByStatus)).toHaveLength(0);
    });
  });
});