begin;

insert into public.policy_modules (id, name, slug)
values
  ('f9e4297f-e316-4d63-9771-f142c180a4c2', 'Doing the Right Thing', 'doing-the-right-thing'),
  ('e31b519c-7bf5-4a35-a976-d05a58e3bf87', 'Health, Care & Safety', 'health-care-safety'),
  ('b8e88ccf-a078-44b7-a76e-924cbae6bce0', 'Learning & Performance', 'learning-performance'),
  ('71315936-321c-4fa9-b5de-b3bcbec4adcb', 'Life at Work', 'life-at-work'),
  ('9ccbbf90-fdbb-4d77-936e-fdee3f0ea5de', 'Pay, Perks & Security', 'pay-perks-security'),
  ('163d337f-71fe-45a8-b03b-f8fc9c0529bd', 'Time Away', 'time-away'),
  ('5544c527-ab86-4caf-8685-a7e2acda61a8', 'Tools & Allowance', 'tools-allowance')
on conflict (id) do nothing;

insert into public.policies (id, module_id, name)
values
  ('6e41f924-4618-48bc-88a3-b65a81776a8e', 'f9e4297f-e316-4d63-9771-f142c180a4c2', 'POSH Policy (Sexual Harassment)'),
  ('34d42796-1e37-45b1-be93-10db359a8438', 'f9e4297f-e316-4d63-9771-f142c180a4c2', 'Equal Employment Opportunity Policy'),
  ('6790db80-9e8a-447a-b48e-f92b6880099a', 'f9e4297f-e316-4d63-9771-f142c180a4c2', 'PIT (Prevention of Insider Trading)'),
  ('2cdf6866-3587-4277-9b02-6f83f1edea8f', 'f9e4297f-e316-4d63-9771-f142c180a4c2', 'Employment of Relatives & Marriage within the Company'),
  ('dd8797a0-5eb6-46a3-929e-5e9aadcae6c3', 'f9e4297f-e316-4d63-9771-f142c180a4c2', 'Code of Conduct'),
  ('4d39e267-aa0d-4f05-9926-fb0b1d3300a7', 'f9e4297f-e316-4d63-9771-f142c180a4c2', 'Whistleblower Policy'),
  ('c501b773-3189-45da-850c-8e366e527068', 'f9e4297f-e316-4d63-9771-f142c180a4c2', 'Conflict of Interest Policy'),
  ('e54a91d6-f2ef-49ab-b81a-e4d608aa22b5', 'e31b519c-7bf5-4a35-a976-d05a58e3bf87', 'Maternity Benefit Act / Policy'),
  ('6e69328f-4443-49a7-b80c-b51d86f9177f', 'e31b519c-7bf5-4a35-a976-d05a58e3bf87', 'Workplace Safety Guidelines / Fire & Safety'),
  ('73326ca2-2e66-4e1d-89de-df5ecc523597', 'e31b519c-7bf5-4a35-a976-d05a58e3bf87', 'Mediclaim, Life Insurance, Personal Accident'),
  ('02b2df2e-6f93-40fb-a20e-ff33b5123e77', 'b8e88ccf-a078-44b7-a76e-924cbae6bce0', 'Training & Development Policy'),
  ('423a6350-d72c-47fc-bae0-af2d36064c46', 'b8e88ccf-a078-44b7-a76e-924cbae6bce0', 'Performance Management Policy'),
  ('11567a86-4ff2-48e8-b29e-ba534ab636d2', '71315936-321c-4fa9-b5de-b3bcbec4adcb', 'Contract Labour (R&A) Act'),
  ('ba5100d1-c145-4435-b918-d376591fc9c3', '71315936-321c-4fa9-b5de-b3bcbec4adcb', 'Recruitment and On-Boarding'),
  ('4889cd45-4d6b-4ec5-ab20-5a83f0d2d59e', '71315936-321c-4fa9-b5de-b3bcbec4adcb', 'Employment Guidelines'),
  ('52ea43f7-9888-490e-bfe6-826628144044', '71315936-321c-4fa9-b5de-b3bcbec4adcb', 'Internship / Trainee Engagement Guidelines'),
  ('6a60b7ff-2008-4f11-974e-4e6d9a9284ef', '9ccbbf90-fdbb-4d77-936e-fdee3f0ea5de', 'Gratuity Policy / Provisioning'),
  ('a3989af5-63af-4ffb-846d-237ec1dbd9a9', '9ccbbf90-fdbb-4d77-936e-fdee3f0ea5de', 'Minimum Wages Compliance / Act'),
  ('f08e3667-82d2-4659-a429-076c58ca7f74', '9ccbbf90-fdbb-4d77-936e-fdee3f0ea5de', 'Compensation & Benefits Policy'),
  ('25579c89-f50f-423a-ba9b-88b1aea3288e', '9ccbbf90-fdbb-4d77-936e-fdee3f0ea5de', 'Employee Loan Policy'),
  ('b5280904-70e5-4000-b8cc-0609846631a6', '9ccbbf90-fdbb-4d77-936e-fdee3f0ea5de', 'Salary Administration'),
  ('49418c7a-0489-4d01-85bf-2207dd2cc84e', '9ccbbf90-fdbb-4d77-936e-fdee3f0ea5de', 'LTA'),
  ('2b85918d-1cab-4d25-908d-7be9c8be6218', '9ccbbf90-fdbb-4d77-936e-fdee3f0ea5de', 'National Pension Scheme (NPS)'),
  ('76a21e66-25f8-4a73-b465-18c218d74780', '163d337f-71fe-45a8-b03b-f8fc9c0529bd', 'Holidays, Leave & Attendance'),
  ('94cd2a86-17b4-4e80-b7b8-4ea2ffa05790', '5544c527-ab86-4caf-8685-a7e2acda61a8', 'Books & Periodicals'),
  ('0aeba334-b20d-4e68-890d-8118eaff30ee', '5544c527-ab86-4caf-8685-a7e2acda61a8', 'Internet & Telephone'),
  ('72fffb84-30b9-4e3a-b92a-78f80657c252', '5544c527-ab86-4caf-8685-a7e2acda61a8', 'Car / Fuel')
on conflict (id) do nothing;

commit;
