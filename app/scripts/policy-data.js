const defaultPolicyData = [
  {
    id: "doing-the-right-thing",
    name: "Doing the Right Thing",
    description: "Ethics, fair practices, and responsible conduct.",
    policies: [
      { id: "6e41f924-4618-48bc-88a3-b65a81776a8e", name: "POSH Policy (Sexual Harassment)" },
      { id: "34d42796-1e37-45b1-be93-10db359a8438", name: "Equal Employment Opportunity Policy" },
      { id: "6790db80-9e8a-447a-b48e-f92b6880099a", name: "PIT (Prevention of Insider Trading)" },
      { id: "2cdf6866-3587-4277-9b02-6f83f1edea8f", name: "Employment of Relatives & Marriage within the Company" },
      { id: "dd8797a0-5eb6-46a3-929e-5e9aadcae6c3", name: "Code of Conduct" },
      { id: "4d39e267-aa0d-4f05-9926-fb0b1d3300a7", name: "Whistleblower Policy" },
      { id: "c501b773-3189-45da-850c-8e366e527068", name: "Conflict of Interest Policy" },
    ],
  },
  {
    id: "health-care-safety",
    name: "Health, Care & Safety",
    description: "Safety guidelines and employee care coverage.",
    policies: [
      { id: "e54a91d6-f2ef-49ab-b81a-e4d608aa22b5", name: "Maternity Benefit Act / Policy" },
      { id: "6e69328f-4443-49a7-b80c-b51d86f9177f", name: "Workplace Safety Guidelines / Fire & Safety" },
      { id: "73326ca2-2e66-4e1d-89de-df5ecc523597", name: "Mediclaim, Life Insurance, Personal Accident" },
    ],
  },
  {
    id: "learning-performance",
    name: "Learning & Performance",
    description: "Growth, development, and performance alignment.",
    policies: [
      { id: "02b2df2e-6f93-40fb-a20e-ff33b5123e77", name: "Training & Development Policy" },
      { id: "423a6350-d72c-47fc-bae0-af2d36064c46", name: "Performance Management Policy" },
    ],
  },
  {
    id: "life-at-work",
    name: "Life at Work",
    description: "Employment standards and on-the-job guidance.",
    policies: [
      { id: "11567a86-4ff2-48e8-b29e-ba534ab636d2", name: "Contract Labour (R&A) Act" },
      { id: "ba5100d1-c145-4435-b918-d376591fc9c3", name: "Recruitment and On-Boarding" },
      { id: "4889cd45-4d6b-4ec5-ab20-5a83f0d2d59e", name: "Employment Guidelines" },
      { id: "52ea43f7-9888-490e-bfe6-826628144044", name: "Internship / Trainee Engagement Guidelines" },
    ],
  },
  {
    id: "pay-perks-security",
    name: "Pay, Perks & Security",
    description: "Compensation, benefits, and statutory obligations.",
    policies: [
      { id: "6a60b7ff-2008-4f11-974e-4e6d9a9284ef", name: "Gratuity Policy / Provisioning" },
      { id: "a3989af5-63af-4ffb-846d-237ec1dbd9a9", name: "Minimum Wages Compliance / Act" },
      { id: "f08e3667-82d2-4659-a429-076c58ca7f74", name: "Compensation & Benefits Policy" },
      { id: "25579c89-f50f-423a-ba9b-88b1aea3288e", name: "Employee Loan Policy" },
      { id: "b5280904-70e5-4000-b8cc-0609846631a6", name: "Salary Administration" },
      { id: "49418c7a-0489-4d01-85bf-2207dd2cc84e", name: "LTA" },
      { id: "2b85918d-1cab-4d25-908d-7be9c8be6218", name: "National Pension Scheme (NPS)" },
    ],
  },
  {
    id: "time-away",
    name: "Time Away",
    description: "Leave planning, holiday schedules, and attendance.",
    policies: [
      { id: "76a21e66-25f8-4a73-b465-18c218d74780", name: "Holidays, Leave & Attendance" },
    ],
  },
  {
    id: "tools-allowance",
    name: "Tools & Allowance",
    description: "Reimbursements for work-related tools and expenses.",
    policies: [
      { id: "94cd2a86-17b4-4e80-b7b8-4ea2ffa05790", name: "Books & Periodicals" },
      { id: "0aeba334-b20d-4e68-890d-8118eaff30ee", name: "Internet & Telephone" },
      { id: "72fffb84-30b9-4e3a-b92a-78f80657c252", name: "Car / Fuel" },
    ],
  },
];

const cloneDefault = () => JSON.parse(JSON.stringify(defaultPolicyData));

export const loadPolicyData = () => {
  const raw = window.localStorage.getItem("policyData");
  if (!raw) return cloneDefault();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to parse policy data:", error);
  }
  return cloneDefault();
};

export const savePolicyData = (data) => {
  window.localStorage.setItem("policyData", JSON.stringify(data));
};

export const resetPolicyData = () => {
  window.localStorage.removeItem("policyData");
};
