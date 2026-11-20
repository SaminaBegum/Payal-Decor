const pool = require("../config/db");
const crypto = require("crypto");

/**
 * Fetch all CRM leads with optional search and filters
 */
const getAllLeads = async (filters = {}) => {
  const {
    search,
    locality,
    genderType,
    source,
    status,
    limit,
    offset,
    sortBy = "createdAt",
    sortOrder = "DESC",
  } = filters;

  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const idx = params.length;
    conditions.push(`(
      LOWER("businessName") LIKE $${idx} OR
      LOWER("source") LIKE $${idx} OR
      LOWER("locality") LIKE $${idx} OR
      LOWER("category") LIKE $${idx} OR
      LOWER("genderType") LIKE $${idx} OR
      LOWER("address") LIKE $${idx} OR
      LOWER("primaryPhone") LIKE $${idx} OR
      LOWER("secondaryEmail") LIKE $${idx} OR
      LOWER(COALESCE("notes", '')) LIKE $${idx}
    )`);
  }

  if (locality && locality !== "All") {
    params.push(locality.trim());
    conditions.push(`"locality" = $${params.length}`);
  }

  if (genderType && genderType !== "All") {
    params.push(genderType.trim());
    conditions.push(`"genderType" = $${params.length}`);
  }

  if (source && source !== "All") {
    params.push(source.trim());
    conditions.push(`"source" = $${params.length}`);
  }

  if (status && status !== "All") {
    params.push(status.trim());
    conditions.push(`"status" = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Validate sort column to avoid SQL injection
  const allowedSortCols = [
    "id",
    "source",
    "businessName",
    "category",
    "genderType",
    "primaryPhone",
    "locality",
    "status",
    "createdAt",
    "updatedAt",
  ];
  const safeSortCol = allowedSortCols.includes(sortBy) ? `"${sortBy}"` : `"createdAt"`;
  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  let paginationClause = "";
  if (limit && Number(limit) > 0) {
    params.push(Number(limit));
    paginationClause += ` LIMIT $${params.length}`;
  }
  if (offset && Number(offset) >= 0) {
    params.push(Number(offset));
    paginationClause += ` OFFSET $${params.length}`;
  }

  const query = `
    SELECT
      id,
      source,
      "businessName",
      category,
      "genderType",
      "primaryPhone",
      "secondaryEmail",
      website,
      address,
      locality,
      "mapsUrl",
      "sourceNote",
      "sourceUrl",
      status,
      notes,
      "lastEmailedAt",
      "createdAt",
      "updatedAt"
    FROM public.crm
    ${whereClause}
    ORDER BY ${safeSortCol} ${safeSortOrder}
    ${paginationClause}
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Get single lead by ID
 */
const getLeadById = async (id) => {
  const query = `
    SELECT
      id,
      source,
      "businessName",
      category,
      "genderType",
      "primaryPhone",
      "secondaryEmail",
      website,
      address,
      locality,
      "mapsUrl",
      "sourceNote",
      "sourceUrl",
      status,
      notes,
      "lastEmailedAt",
      "createdAt",
      "updatedAt"
    FROM public.crm
    WHERE id = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Find lead by business name
 */
const findLeadByBusinessName = async (businessName) => {
  if (!businessName) return null;
  const query = `
    SELECT
      id,
      source,
      "businessName",
      category,
      "genderType",
      "primaryPhone",
      "secondaryEmail",
      website,
      address,
      locality,
      "mapsUrl",
      "sourceNote",
      "sourceUrl",
      status,
      notes,
      "lastEmailedAt",
      "createdAt",
      "updatedAt"
    FROM public.crm
    WHERE LOWER(TRIM("businessName")) = LOWER(TRIM($1))
    LIMIT 1
  `;
  const result = await pool.query(query, [businessName]);
  return result.rows[0] || null;
};

/**
 * Create a new lead in crm table
 */
const createLead = async (leadData) => {
  const {
    id = `crm-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    source = "Meta",
    businessName = null,
    category = null,
    genderType = null,
    primaryPhone = null,
    secondaryEmail = null,
    website = null,
    address = null,
    locality = null,
    mapsUrl = null,
    sourceNote = null,
    sourceUrl = null,
    status = "New",
    notes = null,
    lastEmailedAt = null,
  } = leadData;

  const query = `
    INSERT INTO public.crm (
      id,
      source,
      "businessName",
      category,
      "genderType",
      "primaryPhone",
      "secondaryEmail",
      website,
      address,
      locality,
      "mapsUrl",
      "sourceNote",
      "sourceUrl",
      status,
      notes,
      "lastEmailedAt",
      "createdAt",
      "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING
      id,
      source,
      "businessName",
      category,
      "genderType",
      "primaryPhone",
      "secondaryEmail",
      website,
      address,
      locality,
      "mapsUrl",
      "sourceNote",
      "sourceUrl",
      status,
      notes,
      "lastEmailedAt",
      "createdAt",
      "updatedAt"
  `;

  const values = [
    id,
    source || "Meta",
    businessName ? businessName.trim() : null,
    category ? category.trim() : null,
    genderType ? genderType.trim() : null,
    primaryPhone ? primaryPhone.trim() : null,
    secondaryEmail ? secondaryEmail.trim() : null,
    website ? website.trim() : null,
    address ? address.trim() : null,
    locality ? locality.trim() : null,
    mapsUrl ? mapsUrl.trim() : null,
    sourceNote ? sourceNote.trim() : null,
    sourceUrl ? sourceUrl.trim() : null,
    status || "New",
    notes ? notes.trim() : null,
    lastEmailedAt,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Update an existing lead in crm table (with automatic upsert fallback)
 */
const updateLead = async (id, leadData) => {
  // Check if lead exists by ID first
  let existing = await getLeadById(id);
  if (!existing && leadData.businessName) {
    existing = await findLeadByBusinessName(leadData.businessName);
  }

  
  if (!existing) {
    return await createLead({ ...leadData, id: id || `crm-${Date.now()}` });
  }

  const updatedSource = leadData.source !== undefined ? leadData.source : existing.source;
  const updatedBusinessName = leadData.businessName !== undefined ? leadData.businessName : existing.businessName;
  const updatedCategory = leadData.category !== undefined ? leadData.category : existing.category;
  const updatedGenderType = leadData.genderType !== undefined ? leadData.genderType : existing.genderType;
  const updatedPrimaryPhone = leadData.primaryPhone !== undefined ? leadData.primaryPhone : existing.primaryPhone;
  const updatedSecondaryEmail = leadData.secondaryEmail !== undefined ? leadData.secondaryEmail : existing.secondaryEmail;
  const updatedWebsite = leadData.website !== undefined ? leadData.website : existing.website;
  const updatedAddress = leadData.address !== undefined ? leadData.address : existing.address;
  const updatedLocality = leadData.locality !== undefined ? leadData.locality : existing.locality;
  const updatedMapsUrl = leadData.mapsUrl !== undefined ? leadData.mapsUrl : existing.mapsUrl;
  const updatedSourceNote = leadData.sourceNote !== undefined ? leadData.sourceNote : existing.sourceNote;
  const updatedSourceUrl = leadData.sourceUrl !== undefined ? leadData.sourceUrl : existing.sourceUrl;
  const updatedStatus = leadData.status !== undefined ? leadData.status : existing.status;
  const updatedNotes = leadData.notes !== undefined ? leadData.notes : existing.notes;
  const updatedLastEmailedAt = leadData.lastEmailedAt !== undefined ? leadData.lastEmailedAt : existing.lastEmailedAt;

  const query = `
    UPDATE public.crm
    SET
      source = $1,
      "businessName" = $2,
      category = $3,
      "genderType" = $4,
      "primaryPhone" = $5,
      "secondaryEmail" = $6,
      website = $7,
      address = $8,
      locality = $9,
      "mapsUrl" = $10,
      "sourceNote" = $11,
      "sourceUrl" = $12,
      status = $13,
      notes = $14,
      "lastEmailedAt" = $15,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = $16
    RETURNING
      id,
      source,
      "businessName",
      category,
      "genderType",
      "primaryPhone",
      "secondaryEmail",
      website,
      address,
      locality,
      "mapsUrl",
      "sourceNote",
      "sourceUrl",
      status,
      notes,
      "lastEmailedAt",
      "createdAt",
      "updatedAt"
  `;

  const values = [
    updatedSource,
    updatedBusinessName ? updatedBusinessName.trim() : null,
    updatedCategory ? updatedCategory.trim() : null,
    updatedGenderType ? updatedGenderType.trim() : null,
    updatedPrimaryPhone ? updatedPrimaryPhone.trim() : null,
    updatedSecondaryEmail ? updatedSecondaryEmail.trim() : null,
    updatedWebsite ? updatedWebsite.trim() : null,
    updatedAddress ? updatedAddress.trim() : null,
    updatedLocality ? updatedLocality.trim() : null,
    updatedMapsUrl ? updatedMapsUrl.trim() : null,
    updatedSourceNote ? updatedSourceNote.trim() : null,
    updatedSourceUrl ? updatedSourceUrl.trim() : null,
    updatedStatus,
    updatedNotes ? updatedNotes.trim() : null,
    updatedLastEmailedAt,
    existing.id,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete a lead from crm table
 */
const deleteLead = async (id) => {
  // First try direct id match
  let query = `
    DELETE FROM public.crm
    WHERE id = $1
    RETURNING id, "businessName"
  `;
  let result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    // Fallback: check if id matches a trimmed businessName
    query = `
      DELETE FROM public.crm
      WHERE LOWER(TRIM("businessName")) = LOWER(TRIM($1))
      RETURNING id, "businessName"
    `;
    result = await pool.query(query, [id]);
  }

  return result.rows[0] || null;
};

/**
 * Bulk sync leads into crm table (upsert)
 */
const syncLeads = async (leadsArray = []) => {
  if (!Array.isArray(leadsArray) || leadsArray.length === 0) {
    return { count: 0, synced: [] };
  }

  const synced = [];

  for (const lead of leadsArray) {
    const id = lead.id || `crm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const source = lead.source || "Meta";
    const businessName = lead.businessName ? lead.businessName.trim() : null;
    const category = lead.category ? lead.category.trim() : null;
    const genderType = lead.genderType ? lead.genderType.trim() : null;
    const primaryPhone = lead.primaryPhone ? lead.primaryPhone.trim() : null;
    const secondaryEmail = lead.secondaryEmail ? lead.secondaryEmail.trim() : null;
    const website = lead.website ? lead.website.trim() : null;
    const address = lead.address ? lead.address.trim() : null;
    const locality = lead.locality ? lead.locality.trim() : null;
    const mapsUrl = lead.mapsUrl ? lead.mapsUrl.trim() : null;
    const sourceNote = lead.sourceNote ? lead.sourceNote.trim() : null;
    const sourceUrl = lead.sourceUrl ? lead.sourceUrl.trim() : null;
    const status = lead.status || "New";
    const notes = lead.notes ? lead.notes.trim() : null;
    const lastEmailedAt = lead.lastEmailedAt || null;

    const query = `
      INSERT INTO public.crm (
        id,
        source,
        "businessName",
        category,
        "genderType",
        "primaryPhone",
        "secondaryEmail",
        website,
        address,
        locality,
        "mapsUrl",
        "sourceNote",
        "sourceUrl",
        status,
        notes,
        "lastEmailedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        source = EXCLUDED.source,
        "businessName" = EXCLUDED."businessName",
        category = EXCLUDED.category,
        "genderType" = EXCLUDED."genderType",
        "primaryPhone" = EXCLUDED."primaryPhone",
        "secondaryEmail" = EXCLUDED."secondaryEmail",
        website = EXCLUDED.website,
        address = EXCLUDED.address,
        locality = EXCLUDED.locality,
        "mapsUrl" = EXCLUDED."mapsUrl",
        "sourceNote" = EXCLUDED."sourceNote",
        "sourceUrl" = EXCLUDED."sourceUrl",
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        "lastEmailedAt" = COALESCE(EXCLUDED."lastEmailedAt", public.crm."lastEmailedAt"),
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING id, "businessName", status
    `;

    const values = [
      id,
      source,
      businessName,
      category,
      genderType,
      primaryPhone,
      secondaryEmail,
      website,
      address,
      locality,
      mapsUrl,
      sourceNote,
      sourceUrl,
      status,
      notes,
      lastEmailedAt,
    ];

    try {
      const res = await pool.query(query, values);
      if (res.rows[0]) synced.push(res.rows[0]);
    } catch (err) {
      console.error(`Failed to sync lead ${id}:`, err.message);
    }
  }

  return {
    count: synced.length,
    synced,
  };
};

module.exports = {
  getAllLeads,
  getLeadById,
  findLeadByBusinessName,
  createLead,
  updateLead,
  deleteLead,
  syncLeads,
};
