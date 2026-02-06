var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-VP60pH/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-VP60pH/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/auth.ts
async function authenticateUser(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer vz_agent_")) {
    return authenticateAgentToken(authHeader.slice(7), env);
  }
  const email = request.headers.get("CF-Access-Authenticated-User-Email");
  if (!email) {
    return null;
  }
  return getOrCreateUser(env, email);
}
__name(authenticateUser, "authenticateUser");
async function authenticateAgentToken(token, env) {
  const tokenRow = await env.DB.prepare(`
      SELECT t.canvas_id, t.agent_id, t.scope, t.expires_at, c.owner_id
      FROM agent_tokens t
      JOIN canvases c ON c.id = t.canvas_id
      WHERE t.token = ?
    `).bind(token).first();
  if (!tokenRow)
    return null;
  if (tokenRow.expires_at < Date.now())
    return null;
  return getOrCreateUser(env, tokenRow.owner_id);
}
__name(authenticateAgentToken, "authenticateAgentToken");
async function getOrCreateUser(env, email) {
  const now = Date.now();
  const existing = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (existing)
    return existing;
  const userIdFromEmail = email;
  await env.DB.prepare("INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)").bind(userIdFromEmail, email, now, now).run();
  return {
    id: userIdFromEmail,
    email,
    created_at: now,
    updated_at: now
  };
}
__name(getOrCreateUser, "getOrCreateUser");
async function checkCanvasAccess(env, userId, canvasId, requiredRole) {
  const membership = await env.DB.prepare("SELECT role FROM memberships WHERE canvas_id = ? AND user_id = ?").bind(canvasId, userId).first();
  if (!membership) {
    return { allowed: false };
  }
  if (requiredRole === "owner" && membership.role !== "owner") {
    return { allowed: false, role: membership.role };
  }
  if (requiredRole === "editor" && membership.role === "viewer") {
    return { allowed: false, role: membership.role };
  }
  return { allowed: true, role: membership.role };
}
__name(checkCanvasAccess, "checkCanvasAccess");

// src/utils.ts
function jsonResponse(data, status = 200, env) {
  const allowedOrigin = env?.ALLOWED_ORIGINS || "*";
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, CF-Access-Authenticated-User-Email, Authorization"
    }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}
__name(errorResponse, "errorResponse");
function generateId() {
  return crypto.randomUUID();
}
__name(generateId, "generateId");

// src/routes/canvases.ts
function isLayoutSpec(value) {
  return typeof value === "object" && value !== null && "root" in value && typeof value.root === "object" && value.root !== null;
}
__name(isLayoutSpec, "isLayoutSpec");
function isCreateCanvasBody(value) {
  return typeof value === "object" && value !== null && typeof value.name === "string" && isLayoutSpec(value.spec);
}
__name(isCreateCanvasBody, "isCreateCanvasBody");
function isUpdateCanvasBody(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const { name, spec } = value;
  const hasName = name !== void 0;
  const hasSpec = spec !== void 0;
  if (!hasName && !hasSpec)
    return false;
  const nameValid = !hasName || typeof name === "string";
  const specValid = !hasSpec || isLayoutSpec(spec);
  return nameValid && specValid;
}
__name(isUpdateCanvasBody, "isUpdateCanvasBody");
function normalizeSpec(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}
__name(normalizeSpec, "normalizeSpec");
async function listCanvases(user, env) {
  try {
    const result = await env.DB.prepare(`
        SELECT c.* FROM canvases c
        INNER JOIN memberships m ON c.id = m.canvas_id
        WHERE m.user_id = ?
        ORDER BY c.updated_at DESC
      `).bind(user.id).all();
    const canvases = result.results?.map((c) => ({
      ...c,
      spec: normalizeSpec(c.spec)
    })) || [];
    return jsonResponse(canvases);
  } catch (error) {
    console.error("Error listing canvases:", error);
    return errorResponse("Failed to list canvases", 500);
  }
}
__name(listCanvases, "listCanvases");
async function createCanvas(user, env, request) {
  try {
    const body = await request.json();
    if (!isCreateCanvasBody(body)) {
      return errorResponse("Missing required fields: name, spec");
    }
    const { name, spec } = body;
    const now = Date.now();
    const canvasId = generateId();
    const membershipId = generateId();
    const batch = [
      // Create canvas
      env.DB.prepare(`
        INSERT INTO canvases (id, owner_id, name, spec, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(canvasId, user.id, name, JSON.stringify(spec), now, now),
      // Create owner membership
      env.DB.prepare(`
        INSERT INTO memberships (id, canvas_id, user_id, role, created_at)
        VALUES (?, ?, ?, 'owner', ?)
      `).bind(membershipId, canvasId, user.id, now)
    ];
    await env.DB.batch(batch);
    const canvas = {
      id: canvasId,
      owner_id: user.id,
      name,
      spec,
      created_at: now,
      updated_at: now
    };
    return jsonResponse(canvas, 201);
  } catch (error) {
    console.error("Error creating canvas:", error);
    return errorResponse("Failed to create canvas", 500);
  }
}
__name(createCanvas, "createCanvas");
async function getCanvas(user, env, canvasId) {
  try {
    const access = await checkCanvasAccess(env, user.id, canvasId);
    if (!access.allowed) {
      return errorResponse("Canvas not found or access denied", 404);
    }
    const canvas = await env.DB.prepare("SELECT * FROM canvases WHERE id = ?").bind(canvasId).first();
    if (!canvas) {
      return errorResponse("Canvas not found", 404);
    }
    return jsonResponse({
      ...canvas,
      spec: normalizeSpec(canvas.spec),
      user_role: access.role
    });
  } catch (error) {
    console.error("Error getting canvas:", error);
    return errorResponse("Failed to get canvas", 500);
  }
}
__name(getCanvas, "getCanvas");
async function updateCanvas(user, env, canvasId, request) {
  try {
    const access = await checkCanvasAccess(env, user.id, canvasId, "editor");
    if (!access.allowed) {
      return errorResponse("Access denied - editor or owner role required", 403);
    }
    const body = await request.json();
    if (!isUpdateCanvasBody(body)) {
      return errorResponse("At least one field required: name or spec");
    }
    const { name, spec } = body;
    const updates = [];
    const values = [];
    if (name !== void 0) {
      updates.push("name = ?");
      values.push(name);
    }
    if (spec !== void 0) {
      updates.push("spec = ?");
      values.push(JSON.stringify(spec));
    }
    updates.push("updated_at = ?");
    values.push(Date.now());
    values.push(canvasId);
    await env.DB.prepare(`UPDATE canvases SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    const canvas = await env.DB.prepare("SELECT * FROM canvases WHERE id = ?").bind(canvasId).first();
    if (!canvas) {
      return errorResponse("Canvas not found", 404);
    }
    return jsonResponse({
      ...canvas,
      spec: normalizeSpec(canvas.spec)
    });
  } catch (error) {
    console.error("Error updating canvas:", error);
    return errorResponse("Failed to update canvas", 500);
  }
}
__name(updateCanvas, "updateCanvas");
async function deleteCanvas(user, env, canvasId) {
  try {
    const access = await checkCanvasAccess(env, user.id, canvasId, "owner");
    if (!access.allowed) {
      return errorResponse("Access denied - owner role required", 403);
    }
    await env.DB.prepare("DELETE FROM canvases WHERE id = ?").bind(canvasId).run();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error deleting canvas:", error);
    return errorResponse("Failed to delete canvas", 500);
  }
}
__name(deleteCanvas, "deleteCanvas");

// src/routes/memberships.ts
async function listMembers(user, env, canvasId) {
  try {
    const access = await checkCanvasAccess(env, user.id, canvasId);
    if (!access.allowed) {
      return errorResponse("Canvas not found or access denied", 404);
    }
    const result = await env.DB.prepare(`
        SELECT m.*, u.email, u.display_name
        FROM memberships m
        INNER JOIN users u ON m.user_id = u.id
        WHERE m.canvas_id = ?
        ORDER BY m.created_at ASC
      `).bind(canvasId).all();
    return jsonResponse(result.results || []);
  } catch (error) {
    console.error("Error listing members:", error);
    return errorResponse("Failed to list members", 500);
  }
}
__name(listMembers, "listMembers");
async function addMember(user, env, canvasId, request) {
  try {
    const access = await checkCanvasAccess(env, user.id, canvasId, "editor");
    if (!access.allowed) {
      return errorResponse("Access denied - editor or owner role required", 403);
    }
    const body = await request.json();
    if (!body.email || !body.role) {
      return errorResponse("Missing required fields: email, role");
    }
    if (!["editor", "viewer"].includes(body.role)) {
      return errorResponse("Invalid role - must be editor or viewer");
    }
    const now = Date.now();
    let invitedUser = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(body.email).first();
    if (!invitedUser) {
      const userIdFromEmail = body.email;
      await env.DB.prepare("INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)").bind(userIdFromEmail, body.email, now, now).run();
      invitedUser = { id: userIdFromEmail, email: body.email, created_at: now, updated_at: now };
    }
    const existing = await env.DB.prepare("SELECT * FROM memberships WHERE canvas_id = ? AND user_id = ?").bind(canvasId, invitedUser.id).first();
    if (existing) {
      return errorResponse("User is already a member of this canvas", 409);
    }
    const membershipId = generateId();
    await env.DB.prepare(`
        INSERT INTO memberships (id, canvas_id, user_id, role, invited_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(membershipId, canvasId, invitedUser.id, body.role, user.id, now).run();
    const membership = {
      id: membershipId,
      canvas_id: canvasId,
      user_id: invitedUser.id,
      role: body.role,
      invited_by: user.id,
      created_at: now
    };
    return jsonResponse(membership, 201);
  } catch (error) {
    console.error("Error adding member:", error);
    return errorResponse("Failed to add member", 500);
  }
}
__name(addMember, "addMember");
async function removeMember(user, env, canvasId, targetUserId) {
  try {
    const access = await checkCanvasAccess(env, user.id, canvasId, "owner");
    if (!access.allowed) {
      return errorResponse("Access denied - owner role required", 403);
    }
    const targetMembership = await env.DB.prepare("SELECT role FROM memberships WHERE canvas_id = ? AND user_id = ?").bind(canvasId, targetUserId).first();
    if (!targetMembership) {
      return errorResponse("Member not found", 404);
    }
    if (targetMembership.role === "owner") {
      return errorResponse("Cannot remove canvas owner", 403);
    }
    await env.DB.prepare("DELETE FROM memberships WHERE canvas_id = ? AND user_id = ?").bind(canvasId, targetUserId).run();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return errorResponse("Failed to remove member", 500);
  }
}
__name(removeMember, "removeMember");

// src/routes/agents.ts
async function generateAgentToken(user, env, canvasId, request) {
  const access = await checkCanvasAccess(env, user.id, canvasId, "owner");
  if (!access.allowed) {
    return errorResponse("Canvas not found or insufficient permissions", 404);
  }
  try {
    const body = await request.json();
    const { agentId, scope } = body;
    if (!agentId || !scope) {
      return errorResponse("Missing required fields: agentId, scope", 400);
    }
    if (!["read", "propose", "trusted-propose"].includes(scope)) {
      return errorResponse("Invalid scope. Must be: read, propose, or trusted-propose", 400);
    }
    const now = Date.now();
    const tokenId = generateId();
    const token = `vz_agent_${generateId()}_${generateId()}`;
    const expiresAt = now + 24 * 60 * 60 * 1e3;
    await env.DB.prepare(`
        INSERT INTO agent_tokens (id, canvas_id, agent_id, token, scope, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(tokenId, canvasId, agentId, token, scope, expiresAt, now).run();
    const agentToken = {
      id: tokenId,
      canvas_id: canvasId,
      agent_id: agentId,
      token,
      scope,
      expires_at: expiresAt,
      created_at: now
    };
    return jsonResponse(agentToken);
  } catch (error) {
    console.error("Error generating agent token:", error);
    return errorResponse("Failed to generate agent token", 500);
  }
}
__name(generateAgentToken, "generateAgentToken");
async function revokeAgentToken(user, env, canvasId, agentId) {
  const access = await checkCanvasAccess(env, user.id, canvasId, "owner");
  if (!access.allowed) {
    return errorResponse("Canvas not found or insufficient permissions", 404);
  }
  try {
    await env.DB.prepare(`DELETE FROM agent_tokens WHERE canvas_id = ? AND agent_id = ?`).bind(canvasId, agentId).run();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error revoking agent token:", error);
    return errorResponse("Failed to revoke agent token", 500);
  }
}
__name(revokeAgentToken, "revokeAgentToken");

// src/routes/branches.ts
async function listBranches(user, env, canvasId) {
  const access = await checkCanvasAccess(env, user.id, canvasId);
  if (!access.allowed) {
    return errorResponse("Canvas not found", 404);
  }
  try {
    const result = await env.DB.prepare(`
        SELECT * FROM agent_branches
        WHERE canvas_id = ?
        ORDER BY created_at DESC
      `).bind(canvasId).all();
    return jsonResponse(result.results || []);
  } catch (error) {
    console.error("Error listing branches:", error);
    return errorResponse("Failed to list branches", 500);
  }
}
__name(listBranches, "listBranches");
async function createBranch(user, env, canvasId, request) {
  const access = await checkCanvasAccess(env, user.id, canvasId, "editor");
  if (!access.allowed) {
    return errorResponse("Canvas not found or insufficient permissions", 404);
  }
  try {
    const body = await request.json();
    const { agentId, baseVersion } = body;
    if (!agentId || baseVersion === void 0) {
      return errorResponse("Missing required fields: agentId, baseVersion", 400);
    }
    const now = Date.now();
    const branchId = generateId();
    await env.DB.prepare(`
        INSERT INTO agent_branches (id, canvas_id, agent_id, base_version, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(branchId, canvasId, agentId, baseVersion, "active", now).run();
    const branch = {
      id: branchId,
      canvas_id: canvasId,
      agent_id: agentId,
      base_version: baseVersion,
      status: "active",
      created_at: now
    };
    return jsonResponse(branch);
  } catch (error) {
    console.error("Error creating branch:", error);
    return errorResponse("Failed to create branch", 500);
  }
}
__name(createBranch, "createBranch");
async function getBranch(user, env, branchId) {
  try {
    const branch = await env.DB.prepare(`SELECT * FROM agent_branches WHERE id = ?`).bind(branchId).first();
    if (!branch) {
      return errorResponse("Branch not found", 404);
    }
    const access = await checkCanvasAccess(env, user.id, branch.canvas_id);
    if (!access.allowed) {
      return errorResponse("Canvas not found", 404);
    }
    return jsonResponse(branch);
  } catch (error) {
    console.error("Error getting branch:", error);
    return errorResponse("Failed to get branch", 500);
  }
}
__name(getBranch, "getBranch");
async function deleteBranch(user, env, branchId) {
  try {
    const branch = await env.DB.prepare(`SELECT * FROM agent_branches WHERE id = ?`).bind(branchId).first();
    if (!branch) {
      return errorResponse("Branch not found", 404);
    }
    const access = await checkCanvasAccess(env, user.id, branch.canvas_id, "editor");
    if (!access.allowed) {
      return errorResponse("Canvas not found or insufficient permissions", 404);
    }
    await env.DB.prepare(`DELETE FROM agent_branches WHERE id = ?`).bind(branchId).run();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error deleting branch:", error);
    return errorResponse("Failed to delete branch", 500);
  }
}
__name(deleteBranch, "deleteBranch");

// src/routes/proposals.ts
function applyOperationsToSpec(spec, operations) {
  const newSpec = JSON.parse(JSON.stringify(spec));
  for (const op of operations) {
    switch (op.type) {
      case "create":
        if (op.after) {
          newSpec.root.children.push(op.after);
        }
        break;
      case "update":
        if (op.after) {
          const idx = newSpec.root.children.findIndex((n) => n.id === op.nodeId);
          if (idx >= 0) {
            newSpec.root.children[idx] = { ...newSpec.root.children[idx], ...op.after };
          }
        }
        break;
      case "delete":
        newSpec.root.children = newSpec.root.children.filter((n) => n.id !== op.nodeId);
        break;
      case "move":
        if (op.after && typeof op.after === "object" && "position" in op.after) {
          const idx = newSpec.root.children.findIndex((n) => n.id === op.nodeId);
          if (idx >= 0 && "position" in newSpec.root.children[idx]) {
            newSpec.root.children[idx].position = op.after.position;
          }
        }
        break;
    }
  }
  return newSpec;
}
__name(applyOperationsToSpec, "applyOperationsToSpec");
async function listProposals(user, env, canvasId) {
  const access = await checkCanvasAccess(env, user.id, canvasId);
  if (!access.allowed) {
    return errorResponse("Canvas not found", 404);
  }
  try {
    const result = await env.DB.prepare(`
        SELECT * FROM agent_proposals
        WHERE canvas_id = ?
        ORDER BY created_at DESC
      `).bind(canvasId).all();
    const proposals = (result.results || []).map((p) => ({
      ...p,
      operations: JSON.parse(p.operations),
      assumptions: JSON.parse(p.assumptions)
    }));
    return jsonResponse(proposals);
  } catch (error) {
    console.error("Error listing proposals:", error);
    return errorResponse("Failed to list proposals", 500);
  }
}
__name(listProposals, "listProposals");
async function createProposal(user, env, branchId, request) {
  try {
    const branch = await env.DB.prepare(`SELECT * FROM agent_branches WHERE id = ?`).bind(branchId).first();
    if (!branch) {
      return errorResponse("Branch not found", 404);
    }
    const access = await checkCanvasAccess(env, user.id, branch.canvas_id, "editor");
    if (!access.allowed) {
      return errorResponse("Canvas not found or insufficient permissions", 404);
    }
    const body = await request.json();
    const { title, description, operations, rationale, assumptions, confidence } = body;
    if (!title || !description || !operations || !rationale || assumptions === void 0 || confidence === void 0) {
      return errorResponse("Missing required fields", 400);
    }
    if (confidence < 0 || confidence > 1) {
      return errorResponse("Confidence must be between 0 and 1", 400);
    }
    const now = Date.now();
    const proposalId = generateId();
    await env.DB.prepare(`
        INSERT INTO agent_proposals (
          id, branch_id, canvas_id, agent_id, status,
          title, description, operations, rationale, assumptions,
          confidence, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      proposalId,
      branchId,
      branch.canvas_id,
      branch.agent_id,
      "pending",
      title,
      description,
      JSON.stringify(operations),
      rationale,
      JSON.stringify(assumptions),
      confidence,
      now
    ).run();
    const proposal = {
      id: proposalId,
      branch_id: branchId,
      canvas_id: branch.canvas_id,
      agent_id: branch.agent_id,
      status: "pending",
      title,
      description,
      operations,
      rationale,
      assumptions,
      confidence,
      created_at: now
    };
    return jsonResponse(proposal);
  } catch (error) {
    console.error("Error creating proposal:", error);
    return errorResponse("Failed to create proposal", 500);
  }
}
__name(createProposal, "createProposal");
async function getProposal(user, env, proposalId) {
  try {
    const proposal = await env.DB.prepare(`SELECT * FROM agent_proposals WHERE id = ?`).bind(proposalId).first();
    if (!proposal) {
      return errorResponse("Proposal not found", 404);
    }
    const access = await checkCanvasAccess(env, user.id, proposal.canvas_id);
    if (!access.allowed) {
      return errorResponse("Canvas not found", 404);
    }
    const parsed = {
      ...proposal,
      operations: JSON.parse(proposal.operations),
      assumptions: JSON.parse(proposal.assumptions)
    };
    return jsonResponse(parsed);
  } catch (error) {
    console.error("Error getting proposal:", error);
    return errorResponse("Failed to get proposal", 500);
  }
}
__name(getProposal, "getProposal");
async function approveProposal(user, env, proposalId) {
  try {
    const proposal = await env.DB.prepare(`SELECT * FROM agent_proposals WHERE id = ?`).bind(proposalId).first();
    if (!proposal) {
      return errorResponse("Proposal not found", 404);
    }
    const access = await checkCanvasAccess(env, user.id, proposal.canvas_id, "editor");
    if (!access.allowed) {
      return errorResponse("Canvas not found or insufficient permissions", 404);
    }
    if (proposal.status !== "pending") {
      return errorResponse("Only pending proposals can be approved", 400);
    }
    const now = Date.now();
    const operations = JSON.parse(proposal.operations);
    const canvas = await env.DB.prepare("SELECT spec FROM canvases WHERE id = ?").bind(proposal.canvas_id).first();
    if (!canvas) {
      return errorResponse("Canvas not found", 404);
    }
    const currentSpec = JSON.parse(canvas.spec);
    const updatedSpec = applyOperationsToSpec(currentSpec, operations);
    await env.DB.batch([
      env.DB.prepare(`
          UPDATE agent_proposals
          SET status = ?, reviewed_at = ?, reviewed_by = ?
          WHERE id = ?
        `).bind("approved", now, user.id, proposalId),
      env.DB.prepare(`
          UPDATE canvases
          SET spec = ?, updated_at = ?
          WHERE id = ?
        `).bind(JSON.stringify(updatedSpec), now, proposal.canvas_id)
    ]);
    const updated = {
      ...proposal,
      status: "approved",
      reviewed_at: now,
      reviewed_by: user.id,
      operations,
      assumptions: JSON.parse(proposal.assumptions)
    };
    return jsonResponse(updated);
  } catch (error) {
    console.error("Error approving proposal:", error);
    return errorResponse("Failed to approve proposal", 500);
  }
}
__name(approveProposal, "approveProposal");
async function rejectProposal(user, env, proposalId, request) {
  try {
    const proposal = await env.DB.prepare(`SELECT * FROM agent_proposals WHERE id = ?`).bind(proposalId).first();
    if (!proposal) {
      return errorResponse("Proposal not found", 404);
    }
    const access = await checkCanvasAccess(env, user.id, proposal.canvas_id, "editor");
    if (!access.allowed) {
      return errorResponse("Canvas not found or insufficient permissions", 404);
    }
    if (proposal.status !== "pending") {
      return errorResponse("Only pending proposals can be rejected", 400);
    }
    const now = Date.now();
    await env.DB.prepare(`
        UPDATE agent_proposals
        SET status = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `).bind("rejected", now, user.id, proposalId).run();
    const updated = {
      ...proposal,
      status: "rejected",
      reviewed_at: now,
      reviewed_by: user.id,
      operations: JSON.parse(proposal.operations),
      assumptions: JSON.parse(proposal.assumptions)
    };
    return jsonResponse(updated);
  } catch (error) {
    console.error("Error rejecting proposal:", error);
    return errorResponse("Failed to reject proposal", 500);
  }
}
__name(rejectProposal, "rejectProposal");

// src/routes/discovery.ts
function agentDiscoveryResponse() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Vizail Canvas API",
      version: "1.0.0",
      description: `API for AI agents to collaborate on visual canvas designs.

## Authentication
Include your agent token in the Authorization header:
\`Authorization: Bearer vz_agent_<your_token>\`

## Workflow
1. **Get the canvas** \u2014 \`GET /api/canvases/{canvasId}\` to read the current spec
2. **Get or create a branch** \u2014 \`GET /api/canvases/{canvasId}/branches\` or \`POST\`
3. **Submit a proposal** \u2014 \`POST /api/branches/{branchId}/proposals\` with operations
4. **Wait for review** \u2014 The human reviews and approves/rejects your proposal
5. **Check status** \u2014 \`GET /api/proposals/{proposalId}\` to see if approved

## Node Types
The canvas spec uses a tree of typed nodes. The root is always a \`frame\` node.
Supported types: frame, group, stack, grid, text, image, box, rect, ellipse, line, curve.

## Proposal Operations
Each operation targets a node by ID:
- \`create\` \u2014 Add a new node. Provide \`after\` with the full node object (must include \`id\` and \`type\`).
- \`update\` \u2014 Modify an existing node. Provide \`nodeId\` and \`after\` with changed properties.
- \`delete\` \u2014 Remove a node. Provide \`nodeId\`.
- \`move\`   \u2014 Reposition a node. Provide \`nodeId\` and \`after: { position: { x, y } }\`.

**Important**: Operations apply to \`root.children\` only (top-level nodes). To modify nodes inside a group, update the group itself.`
    },
    servers: [
      { url: "http://localhost:62587/api", description: "Local development" }
    ],
    security: [{ agentToken: [] }],
    components: {
      securitySchemes: {
        agentToken: {
          type: "http",
          scheme: "bearer",
          description: "Agent token in format vz_agent_<id>_<secret>"
        }
      },
      schemas: {
        Position: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" }
          },
          required: ["x", "y"]
        },
        Size: {
          type: "object",
          properties: {
            width: { type: "number" },
            height: { type: "number" }
          },
          required: ["width", "height"]
        },
        NodeBase: {
          type: "object",
          description: "Common properties for all node types",
          properties: {
            id: { type: "string", description: "Unique node identifier" },
            name: { type: "string" },
            visible: { type: "boolean", default: true },
            locked: { type: "boolean", default: false },
            rotation: { type: "number", description: "Degrees" },
            opacity: { type: "number", minimum: 0, maximum: 1 },
            position: { $ref: "#/components/schemas/Position" },
            size: { $ref: "#/components/schemas/Size" }
          },
          required: ["id"]
        },
        RectNode: {
          allOf: [
            { $ref: "#/components/schemas/NodeBase" },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["rect"] },
                fill: { type: "string", description: "CSS color, e.g. #ff0000" },
                stroke: { type: "string" },
                strokeWidth: { type: "number" },
                cornerRadius: { type: "number" }
              },
              required: ["type"]
            }
          ]
        },
        EllipseNode: {
          allOf: [
            { $ref: "#/components/schemas/NodeBase" },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["ellipse"] },
                fill: { type: "string" },
                stroke: { type: "string" },
                strokeWidth: { type: "number" }
              },
              required: ["type"]
            }
          ]
        },
        TextNode: {
          allOf: [
            { $ref: "#/components/schemas/NodeBase" },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["text"] },
                text: { type: "string" },
                fontSize: { type: "number" },
                fontFamily: { type: "string" },
                fontWeight: { type: "string" },
                fontStyle: { type: "string" },
                fill: { type: "string" },
                align: { type: "string", enum: ["left", "center", "right"] }
              },
              required: ["type", "text"]
            }
          ]
        },
        LineNode: {
          allOf: [
            { $ref: "#/components/schemas/NodeBase" },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["line"] },
                points: {
                  type: "array",
                  items: { type: "number" },
                  description: "Flat array: [x1, y1, x2, y2]"
                },
                stroke: { type: "string" },
                strokeWidth: { type: "number" }
              },
              required: ["type", "points"]
            }
          ]
        },
        CurveNode: {
          allOf: [
            { $ref: "#/components/schemas/NodeBase" },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["curve"] },
                points: {
                  type: "array",
                  items: { type: "number" },
                  description: "Bezier control points: [x1,y1, cx1,cy1, cx2,cy2, x2,y2]"
                },
                stroke: { type: "string" },
                strokeWidth: { type: "number" },
                tension: { type: "number" },
                lineCap: { type: "string", enum: ["butt", "round", "square"] }
              },
              required: ["type", "points"]
            }
          ]
        },
        ImageNode: {
          allOf: [
            { $ref: "#/components/schemas/NodeBase" },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["image"] },
                src: { type: "string", description: "Image URL" }
              },
              required: ["type", "src"]
            }
          ]
        },
        GroupNode: {
          allOf: [
            { $ref: "#/components/schemas/NodeBase" },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["group"] },
                children: { type: "array", items: { $ref: "#/components/schemas/LayoutNode" } }
              },
              required: ["type", "children"]
            }
          ]
        },
        FrameNode: {
          allOf: [
            { $ref: "#/components/schemas/NodeBase" },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["frame"] },
                fill: { type: "string" },
                children: { type: "array", items: { $ref: "#/components/schemas/LayoutNode" } }
              },
              required: ["type", "size", "children"]
            }
          ]
        },
        LayoutNode: {
          oneOf: [
            { $ref: "#/components/schemas/FrameNode" },
            { $ref: "#/components/schemas/GroupNode" },
            { $ref: "#/components/schemas/RectNode" },
            { $ref: "#/components/schemas/EllipseNode" },
            { $ref: "#/components/schemas/TextNode" },
            { $ref: "#/components/schemas/LineNode" },
            { $ref: "#/components/schemas/CurveNode" },
            { $ref: "#/components/schemas/ImageNode" }
          ],
          discriminator: { propertyName: "type" }
        },
        LayoutSpec: {
          type: "object",
          properties: {
            version: { type: "string" },
            root: { $ref: "#/components/schemas/FrameNode" }
          },
          required: ["root"]
        },
        ProposalOperation: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["create", "update", "delete", "move"] },
            nodeId: { type: "string", description: "Target node ID (for create, use the new node ID)" },
            before: { description: "Previous node state (optional, for diffing)" },
            after: { description: "Desired node state. For create: full node object. For update: partial properties." },
            rationale: { type: "string", description: "Why this operation is needed" }
          },
          required: ["type", "nodeId"]
        },
        Proposal: {
          type: "object",
          properties: {
            id: { type: "string" },
            branch_id: { type: "string" },
            canvas_id: { type: "string" },
            agent_id: { type: "string" },
            status: { type: "string", enum: ["pending", "approved", "rejected", "superseded"] },
            title: { type: "string" },
            description: { type: "string" },
            operations: { type: "array", items: { $ref: "#/components/schemas/ProposalOperation" } },
            rationale: { type: "string" },
            assumptions: { type: "array", items: { type: "string" } },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            created_at: { type: "integer" },
            reviewed_at: { type: "integer" },
            reviewed_by: { type: "string" }
          }
        },
        Canvas: {
          type: "object",
          properties: {
            id: { type: "string" },
            owner_id: { type: "string" },
            name: { type: "string" },
            spec: { $ref: "#/components/schemas/LayoutSpec" },
            created_at: { type: "integer" },
            updated_at: { type: "integer" }
          }
        },
        Branch: {
          type: "object",
          properties: {
            id: { type: "string" },
            canvas_id: { type: "string" },
            agent_id: { type: "string" },
            base_version: { type: "integer" },
            status: { type: "string", enum: ["active", "merged", "abandoned"] },
            created_at: { type: "integer" }
          }
        }
      }
    },
    paths: {
      "/canvases/{canvasId}": {
        get: {
          operationId: "getCanvas",
          summary: "Get the current canvas spec",
          description: "Returns the full canvas including its node tree. Start here to understand the current state.",
          parameters: [
            { name: "canvasId", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            "200": {
              description: "Canvas with full spec",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Canvas" } } }
            }
          }
        }
      },
      "/canvases/{canvasId}/branches": {
        get: {
          operationId: "listBranches",
          summary: "List branches for a canvas",
          parameters: [
            { name: "canvasId", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            "200": {
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Branch" } } } }
            }
          }
        },
        post: {
          operationId: "createBranch",
          summary: "Create a new branch for your agent",
          parameters: [
            { name: "canvasId", in: "path", required: true, schema: { type: "string" } }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    agentId: { type: "string", description: "Your agent identifier" },
                    baseVersion: { type: "integer", default: 1 }
                  },
                  required: ["agentId", "baseVersion"]
                }
              }
            }
          },
          responses: {
            "201": {
              content: { "application/json": { schema: { $ref: "#/components/schemas/Branch" } } }
            }
          }
        }
      },
      "/canvases/{canvasId}/proposals": {
        get: {
          operationId: "listProposals",
          summary: "List all proposals for a canvas",
          description: "Check the status of your proposals and see what others have proposed.",
          parameters: [
            { name: "canvasId", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            "200": {
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Proposal" } } } }
            }
          }
        }
      },
      "/branches/{branchId}/proposals": {
        post: {
          operationId: "createProposal",
          summary: "Submit a proposal with canvas changes",
          description: `Submit a set of operations that modify the canvas. The human owner will review and approve or reject.
          
Each operation must include:
- \`type\`: create, update, delete, or move
- \`nodeId\`: the target node ID
- \`after\`: the desired state (for create/update/move)

For \`create\` operations, \`after\` must be a complete node object with at minimum \`id\` and \`type\`.

Example creating a red rectangle:
\`\`\`json
{
  "type": "create",
  "nodeId": "my-rect-1",
  "after": {
    "id": "my-rect-1",
    "type": "rect",
    "position": { "x": 100, "y": 200 },
    "size": { "width": 300, "height": 150 },
    "fill": "#ef4444",
    "cornerRadius": 8
  }
}
\`\`\``,
          parameters: [
            { name: "branchId", in: "path", required: true, schema: { type: "string" } }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Short title for the proposal" },
                    description: { type: "string", description: "What changes are being made and why" },
                    operations: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProposalOperation" },
                      description: "The list of node operations to apply"
                    },
                    rationale: { type: "string", description: "Overall reasoning for these changes" },
                    assumptions: {
                      type: "array",
                      items: { type: "string" },
                      description: "List any assumptions made about the design intent"
                    },
                    confidence: {
                      type: "number",
                      minimum: 0,
                      maximum: 1,
                      description: "How confident you are in this proposal (0.0 to 1.0)"
                    }
                  },
                  required: ["title", "description", "operations", "rationale", "assumptions", "confidence"]
                }
              }
            }
          },
          responses: {
            "201": {
              content: { "application/json": { schema: { $ref: "#/components/schemas/Proposal" } } }
            }
          }
        }
      },
      "/proposals/{proposalId}": {
        get: {
          operationId: "getProposal",
          summary: "Get proposal status and details",
          parameters: [
            { name: "proposalId", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            "200": {
              content: { "application/json": { schema: { $ref: "#/components/schemas/Proposal" } } }
            }
          }
        }
      }
    }
  };
  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(agentDiscoveryResponse, "agentDiscoveryResponse");

// src/index.ts
var CANVAS_ID_ROUTE = new RegExp("^/api/canvases/([^/]+)$");
var CANVAS_MEMBERS_ROUTE = new RegExp("^/api/canvases/([^/]+)/members$");
var CANVAS_MEMBER_ROUTE = new RegExp("^/api/canvases/([^/]+)/members/([^/]+)$");
var CANVAS_AGENT_TOKEN_ROUTE = new RegExp("^/api/canvases/([^/]+)/agent-token$");
var CANVAS_AGENT_TOKEN_DELETE_ROUTE = new RegExp("^/api/canvases/([^/]+)/agent-token/([^/]+)$");
var CANVAS_BRANCHES_ROUTE = new RegExp("^/api/canvases/([^/]+)/branches$");
var BRANCH_ID_ROUTE = new RegExp("^/api/branches/([^/]+)$");
var CANVAS_PROPOSALS_ROUTE = new RegExp("^/api/canvases/([^/]+)/proposals$");
var BRANCH_PROPOSALS_ROUTE = new RegExp("^/api/branches/([^/]+)/proposals$");
var PROPOSAL_ID_ROUTE = new RegExp("^/api/proposals/([^/]+)$");
var PROPOSAL_APPROVE_ROUTE = new RegExp("^/api/proposals/([^/]+)/approve$");
var PROPOSAL_REJECT_ROUTE = new RegExp("^/api/proposals/([^/]+)/reject$");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, CF-Access-Authenticated-User-Email, Authorization"
        }
      });
    }
    if ((url.pathname === "/api/agent/discover" || url.pathname === "/api/openapi.json") && request.method === "GET") {
      return agentDiscoveryResponse();
    }
    const user = await authenticateUser(request, env);
    if (!user) {
      return errorResponse("Unauthorized - provide CF-Access-Authenticated-User-Email header or Authorization: Bearer vz_agent_... token", 401);
    }
    const path = url.pathname;
    const method = request.method;
    try {
      if (path === "/api/canvases" && method === "GET") {
        return await listCanvases(user, env);
      }
      if (path === "/api/canvases" && method === "POST") {
        return await createCanvas(user, env, request);
      }
      const canvasMatch = path.match(CANVAS_ID_ROUTE);
      if (canvasMatch) {
        const canvasId = canvasMatch[1];
        if (method === "GET") {
          return await getCanvas(user, env, canvasId);
        }
        if (method === "PUT") {
          return await updateCanvas(user, env, canvasId, request);
        }
        if (method === "DELETE") {
          return await deleteCanvas(user, env, canvasId);
        }
      }
      const membersMatch = path.match(CANVAS_MEMBERS_ROUTE);
      if (membersMatch) {
        const canvasId = membersMatch[1];
        if (method === "GET") {
          return await listMembers(user, env, canvasId);
        }
        if (method === "POST") {
          return await addMember(user, env, canvasId, request);
        }
      }
      const memberMatch = path.match(CANVAS_MEMBER_ROUTE);
      if (memberMatch) {
        const [, canvasId, userId] = memberMatch;
        if (method === "DELETE") {
          return await removeMember(user, env, canvasId, userId);
        }
      }
      const agentTokenMatch = path.match(CANVAS_AGENT_TOKEN_ROUTE);
      if (agentTokenMatch) {
        const canvasId = agentTokenMatch[1];
        if (method === "POST") {
          return await generateAgentToken(user, env, canvasId, request);
        }
      }
      const agentTokenDeleteMatch = path.match(CANVAS_AGENT_TOKEN_DELETE_ROUTE);
      if (agentTokenDeleteMatch) {
        const [, canvasId, agentId] = agentTokenDeleteMatch;
        if (method === "DELETE") {
          return await revokeAgentToken(user, env, canvasId, agentId);
        }
      }
      const branchesMatch = path.match(CANVAS_BRANCHES_ROUTE);
      if (branchesMatch) {
        const canvasId = branchesMatch[1];
        if (method === "GET") {
          return await listBranches(user, env, canvasId);
        }
        if (method === "POST") {
          return await createBranch(user, env, canvasId, request);
        }
      }
      const branchMatch = path.match(BRANCH_ID_ROUTE);
      if (branchMatch) {
        const branchId = branchMatch[1];
        if (method === "GET") {
          return await getBranch(user, env, branchId);
        }
        if (method === "DELETE") {
          return await deleteBranch(user, env, branchId);
        }
      }
      const canvasProposalsMatch = path.match(CANVAS_PROPOSALS_ROUTE);
      if (canvasProposalsMatch) {
        const canvasId = canvasProposalsMatch[1];
        if (method === "GET") {
          return await listProposals(user, env, canvasId);
        }
      }
      const branchProposalsMatch = path.match(BRANCH_PROPOSALS_ROUTE);
      if (branchProposalsMatch) {
        const branchId = branchProposalsMatch[1];
        if (method === "POST") {
          return await createProposal(user, env, branchId, request);
        }
      }
      const proposalMatch = path.match(PROPOSAL_ID_ROUTE);
      if (proposalMatch) {
        const proposalId = proposalMatch[1];
        if (method === "GET") {
          return await getProposal(user, env, proposalId);
        }
      }
      const approveMatch = path.match(PROPOSAL_APPROVE_ROUTE);
      if (approveMatch) {
        const proposalId = approveMatch[1];
        if (method === "POST") {
          return await approveProposal(user, env, proposalId);
        }
      }
      const rejectMatch = path.match(PROPOSAL_REJECT_ROUTE);
      if (rejectMatch) {
        const proposalId = rejectMatch[1];
        if (method === "POST") {
          return await rejectProposal(user, env, proposalId, request);
        }
      }
      if (path === "/health" || path === "/api/health") {
        return jsonResponse({ status: "ok", timestamp: Date.now() });
      }
      return errorResponse("Not found", 404);
    } catch (error) {
      console.error("Unhandled error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-VP60pH/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-VP60pH/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
