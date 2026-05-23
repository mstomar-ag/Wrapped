import "dotenv/config";
import { Octokit } from "@octokit/rest";

const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Orgs the token can see
const orgs = await gh.orgs.listForAuthenticatedUser({ per_page: 100 });
console.log(`Orgs the PAT can see: ${orgs.data.length}`);
for (const o of orgs.data) console.log(`  ${o.login}`);

// All repos (paginated) — counts
const repos = await gh.paginate(gh.repos.listForAuthenticatedUser, {
  per_page: 100,
  affiliation: "owner,collaborator,organization_member",
});
console.log(`\nAccessible repos: ${repos.length}`);
const byOwner = new Map<string, number>();
for (const r of repos) byOwner.set(r.owner.login, (byOwner.get(r.owner.login) ?? 0) + 1);
for (const [owner, count] of byOwner) console.log(`  ${owner.padEnd(30)} ${count} repos`);

// Token scopes + SSO header (this is the smoking gun)
const me = await gh.request("GET /user");
console.log(`\nAuthenticated as: ${me.data.login}`);
console.log(`Scopes:           ${me.headers["x-oauth-scopes"]}`);
console.log(`SSO header:       ${me.headers["x-github-sso"] ?? "(none — no SAML-protected orgs gating this token)"}`);
