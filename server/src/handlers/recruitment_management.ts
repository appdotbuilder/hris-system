import { db } from '../db';
import { jobVacanciesTable, applicantsTable, departmentsTable } from '../db/schema';
import { 
  type JobVacancy, 
  type CreateJobVacancyInput, 
  type UpdateJobVacancyInput,
  type Applicant,
  type CreateApplicantInput,
  type UpdateApplicantStatusInput,
  type IdParam
} from '../schema';
import { eq, and, or, ilike, count } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

// Job vacancy handlers
export const createJobVacancy = async (input: CreateJobVacancyInput): Promise<JobVacancy> => {
  try {
    // Verify department exists if departmentId is provided
    if (input.departmentId) {
      const department = await db.select()
        .from(departmentsTable)
        .where(eq(departmentsTable.id, input.departmentId))
        .execute();
      
      if (department.length === 0) {
        throw new Error('Department not found');
      }
    }

    const result = await db.insert(jobVacanciesTable)
      .values({
        title: input.title,
        description: input.description,
        departmentId: input.departmentId || null,
        status: input.status,
        postedDate: input.postedDate.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    return {
      ...result[0],
      postedDate: new Date(result[0].postedDate),
      created_at: new Date(result[0].created_at)
    };
  } catch (error) {
    console.error('Job vacancy creation failed:', error);
    throw error;
  }
};

export const getJobVacancies = async (): Promise<JobVacancy[]> => {
  try {
    const result = await db.select()
      .from(jobVacanciesTable)
      .execute();

    return result.map(vacancy => ({
      ...vacancy,
      postedDate: new Date(vacancy.postedDate),
      created_at: new Date(vacancy.created_at)
    }));
  } catch (error) {
    console.error('Fetching job vacancies failed:', error);
    throw error;
  }
};

export const getOpenJobVacancies = async (): Promise<JobVacancy[]> => {
  try {
    const result = await db.select()
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.status, 'Open'))
      .execute();

    return result.map(vacancy => ({
      ...vacancy,
      postedDate: new Date(vacancy.postedDate),
      created_at: new Date(vacancy.created_at)
    }));
  } catch (error) {
    console.error('Fetching open job vacancies failed:', error);
    throw error;
  }
};

export const getJobVacancyById = async (params: IdParam): Promise<JobVacancy | null> => {
  try {
    const result = await db.select()
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.id, params.id))
      .execute();

    if (result.length === 0) return null;
    
    return {
      ...result[0],
      postedDate: new Date(result[0].postedDate),
      created_at: new Date(result[0].created_at)
    };
  } catch (error) {
    console.error('Fetching job vacancy failed:', error);
    throw error;
  }
};

export const updateJobVacancy = async (input: UpdateJobVacancyInput): Promise<JobVacancy> => {
  try {
    // Verify job vacancy exists
    const existingVacancy = await db.select()
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.id, input.id))
      .execute();
    
    if (existingVacancy.length === 0) {
      throw new Error('Job vacancy not found');
    }

    // Verify department exists if departmentId is being updated
    if (input.departmentId !== undefined && input.departmentId !== null) {
      const department = await db.select()
        .from(departmentsTable)
        .where(eq(departmentsTable.id, input.departmentId))
        .execute();
      
      if (department.length === 0) {
        throw new Error('Department not found');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.departmentId !== undefined) updateData.departmentId = input.departmentId;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.postedDate !== undefined) updateData.postedDate = input.postedDate.toISOString().split('T')[0];

    const result = await db.update(jobVacanciesTable)
      .set(updateData)
      .where(eq(jobVacanciesTable.id, input.id))
      .returning()
      .execute();

    return {
      ...result[0],
      postedDate: new Date(result[0].postedDate),
      created_at: new Date(result[0].created_at)
    };
  } catch (error) {
    console.error('Job vacancy update failed:', error);
    throw error;
  }
};

export const deleteJobVacancy = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    // Check if job vacancy exists
    const existingVacancy = await db.select()
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.id, params.id))
      .execute();
    
    if (existingVacancy.length === 0) {
      throw new Error('Job vacancy not found');
    }

    // Check if there are any applicants for this job vacancy
    const applicants = await db.select()
      .from(applicantsTable)
      .where(eq(applicantsTable.jobVacancyId, params.id))
      .execute();
    
    if (applicants.length > 0) {
      throw new Error('Cannot delete job vacancy with existing applicants');
    }

    await db.delete(jobVacanciesTable)
      .where(eq(jobVacanciesTable.id, params.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Job vacancy deletion failed:', error);
    throw error;
  }
};

export const closeJobVacancy = async (params: IdParam): Promise<JobVacancy> => {
  try {
    // Verify job vacancy exists
    const existingVacancy = await db.select()
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.id, params.id))
      .execute();
    
    if (existingVacancy.length === 0) {
      throw new Error('Job vacancy not found');
    }

    const result = await db.update(jobVacanciesTable)
      .set({ status: 'Closed' })
      .where(eq(jobVacanciesTable.id, params.id))
      .returning()
      .execute();

    return {
      ...result[0],
      postedDate: new Date(result[0].postedDate),
      created_at: new Date(result[0].created_at)
    };
  } catch (error) {
    console.error('Job vacancy closure failed:', error);
    throw error;
  }
};

export const getJobVacanciesByDepartment = async (params: { departmentId: number }): Promise<JobVacancy[]> => {
  try {
    // Verify department exists
    const department = await db.select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, params.departmentId))
      .execute();
    
    if (department.length === 0) {
      throw new Error('Department not found');
    }

    const result = await db.select()
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.departmentId, params.departmentId))
      .execute();

    return result.map(vacancy => ({
      ...vacancy,
      postedDate: new Date(vacancy.postedDate),
      created_at: new Date(vacancy.created_at)
    }));
  } catch (error) {
    console.error('Fetching job vacancies by department failed:', error);
    throw error;
  }
};

// Applicant handlers
export const createApplicant = async (input: CreateApplicantInput): Promise<Applicant> => {
  try {
    // Verify job vacancy exists
    const jobVacancy = await db.select()
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.id, input.jobVacancyId))
      .execute();
    
    if (jobVacancy.length === 0) {
      throw new Error('Job vacancy not found');
    }

    const result = await db.insert(applicantsTable)
      .values({
        fullName: input.fullName,
        email: input.email,
        phoneNumber: input.phoneNumber || null,
        resumeUrl: input.resumeUrl || null,
        jobVacancyId: input.jobVacancyId,
        applicationDate: input.applicationDate.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        status: input.status
      })
      .returning()
      .execute();

    return {
      ...result[0],
      applicationDate: new Date(result[0].applicationDate),
      created_at: new Date(result[0].created_at)
    };
  } catch (error) {
    console.error('Applicant creation failed:', error);
    throw error;
  }
};

export const getApplicants = async (): Promise<Applicant[]> => {
  try {
    const result = await db.select()
      .from(applicantsTable)
      .execute();

    return result.map(applicant => ({
      ...applicant,
      applicationDate: new Date(applicant.applicationDate),
      created_at: new Date(applicant.created_at)
    }));
  } catch (error) {
    console.error('Fetching applicants failed:', error);
    throw error;
  }
};

export const getApplicantsByJobVacancy = async (params: { jobVacancyId: number }): Promise<Applicant[]> => {
  try {
    // Verify job vacancy exists
    const jobVacancy = await db.select()
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.id, params.jobVacancyId))
      .execute();
    
    if (jobVacancy.length === 0) {
      throw new Error('Job vacancy not found');
    }

    const result = await db.select()
      .from(applicantsTable)
      .where(eq(applicantsTable.jobVacancyId, params.jobVacancyId))
      .execute();

    return result.map(applicant => ({
      ...applicant,
      applicationDate: new Date(applicant.applicationDate),
      created_at: new Date(applicant.created_at)
    }));
  } catch (error) {
    console.error('Fetching applicants by job vacancy failed:', error);
    throw error;
  }
};

export const getApplicantById = async (params: IdParam): Promise<Applicant | null> => {
  try {
    const result = await db.select()
      .from(applicantsTable)
      .where(eq(applicantsTable.id, params.id))
      .execute();

    if (result.length === 0) return null;
    
    return {
      ...result[0],
      applicationDate: new Date(result[0].applicationDate),
      created_at: new Date(result[0].created_at)
    };
  } catch (error) {
    console.error('Fetching applicant failed:', error);
    throw error;
  }
};

export const updateApplicantStatus = async (input: UpdateApplicantStatusInput): Promise<Applicant> => {
  try {
    // Verify applicant exists
    const existingApplicant = await db.select()
      .from(applicantsTable)
      .where(eq(applicantsTable.id, input.id))
      .execute();
    
    if (existingApplicant.length === 0) {
      throw new Error('Applicant not found');
    }

    const result = await db.update(applicantsTable)
      .set({ status: input.status })
      .where(eq(applicantsTable.id, input.id))
      .returning()
      .execute();

    return {
      ...result[0],
      applicationDate: new Date(result[0].applicationDate),
      created_at: new Date(result[0].created_at)
    };
  } catch (error) {
    console.error('Applicant status update failed:', error);
    throw error;
  }
};

export const deleteApplicant = async (params: IdParam): Promise<{ success: boolean }> => {
  try {
    // Check if applicant exists
    const existingApplicant = await db.select()
      .from(applicantsTable)
      .where(eq(applicantsTable.id, params.id))
      .execute();
    
    if (existingApplicant.length === 0) {
      throw new Error('Applicant not found');
    }

    await db.delete(applicantsTable)
      .where(eq(applicantsTable.id, params.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Applicant deletion failed:', error);
    throw error;
  }
};

export const getApplicantsByStatus = async (params: { 
  status: 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected' 
}): Promise<Applicant[]> => {
  try {
    const result = await db.select()
      .from(applicantsTable)
      .where(eq(applicantsTable.status, params.status))
      .execute();

    return result.map(applicant => ({
      ...applicant,
      applicationDate: new Date(applicant.applicationDate),
      created_at: new Date(applicant.created_at)
    }));
  } catch (error) {
    console.error('Fetching applicants by status failed:', error);
    throw error;
  }
};

export const searchApplicants = async (params: { 
  searchTerm: string 
}): Promise<Applicant[]> => {
  try {
    const searchPattern = `%${params.searchTerm}%`;
    
    const result = await db.select()
      .from(applicantsTable)
      .where(
        or(
          ilike(applicantsTable.fullName, searchPattern),
          ilike(applicantsTable.email, searchPattern)
        )
      )
      .execute();

    return result.map(applicant => ({
      ...applicant,
      applicationDate: new Date(applicant.applicationDate),
      created_at: new Date(applicant.created_at)
    }));
  } catch (error) {
    console.error('Searching applicants failed:', error);
    throw error;
  }
};

export const getRecruitmentStatistics = async (): Promise<{
  totalVacancies: number;
  openVacancies: number;
  totalApplicants: number;
  applicantsByStatus: Record<string, number>;
}> => {
  try {
    // Get total vacancies
    const totalVacanciesResult = await db.select({ count: count() })
      .from(jobVacanciesTable)
      .execute();

    // Get open vacancies
    const openVacanciesResult = await db.select({ count: count() })
      .from(jobVacanciesTable)
      .where(eq(jobVacanciesTable.status, 'Open'))
      .execute();

    // Get total applicants
    const totalApplicantsResult = await db.select({ count: count() })
      .from(applicantsTable)
      .execute();

    // Get applicants by status
    const applicantsByStatusResult = await db.select({
      status: applicantsTable.status,
      count: count()
    })
      .from(applicantsTable)
      .groupBy(applicantsTable.status)
      .execute();

    // Convert applicant status counts to record
    const applicantsByStatus: Record<string, number> = {};
    applicantsByStatusResult.forEach(item => {
      applicantsByStatus[item.status] = item.count;
    });

    return {
      totalVacancies: totalVacanciesResult[0].count,
      openVacancies: openVacanciesResult[0].count,
      totalApplicants: totalApplicantsResult[0].count,
      applicantsByStatus
    };
  } catch (error) {
    console.error('Fetching recruitment statistics failed:', error);
    throw error;
  }
};