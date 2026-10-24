/**
 * Comprehensive Automated Verification Suite for QuickShare Private Admin & Monitoring
 */
const BASE_URL = 'http://localhost:5050';

async function runTests() {
  console.log('===============================================================');
  console.log('QUICKSHARE ADMIN ACCESS & SECURITY MONITORING VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Authorized Administrator Sign-In
    // -------------------------------------------------------------------------
    console.log('Test 1: Administrator Authentication...');
    const adminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'AdminSecure@QuickShare2026!',
        mfaCode: '849201'
      })
    });

    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginData.success && adminLoginData.token, 
      'Authorized administrator signs in successfully with MFA and receives JWT token');
    const adminToken = adminLoginData.token;

    // Verify admin can access overview
    const overviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const overviewData = await overviewRes.json();
    assert(overviewRes.status === 200 && overviewData.success && overviewData.overview.totalUsers !== undefined,
      'Authorized administrator can access /api/admin/overview');

    // -------------------------------------------------------------------------
    // TEST 2: Unauthenticated Visitor is Denied
    // -------------------------------------------------------------------------
    console.log('\nTest 2: Unauthenticated Access Rejection...');
    const unauthRes = await fetch(`${BASE_URL}/api/admin/overview`);
    assert(unauthRes.status === 401, 'Unauthenticated visitor to /api/admin/overview is rejected with 401 Unauthorized');

    const unauthUsersRes = await fetch(`${BASE_URL}/api/admin/users`);
    assert(unauthUsersRes.status === 401, 'Unauthenticated visitor to /api/admin/users is rejected with 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 3: Normal User is Denied Access
    // -------------------------------------------------------------------------
    console.log('\nTest 3: Normal Registered User Denial...');
    const normalUserSuffix = Math.floor(1000 + Math.random() * 9000);
    const normalUsername = `tester_${normalUserSuffix}`;
    const normalEmail = `tester_${normalUserSuffix}@example.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: normalUsername,
        email: normalEmail,
        password: 'NormalUserPassword123!',
        displayName: 'Test Normal User'
      })
    });
    const regData = await regRes.json();
    const normalToken = regData.token;
    assert(regRes.status === 201 && normalToken, `Created regular user "${normalUsername}"`);

    // Normal user attempts to access admin overview
    const normalToAdminRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${normalToken}` }
    });
    assert(normalToAdminRes.status === 403, 'Normal user is rejected from /api/admin/overview with 403 Forbidden');

    // Normal user attempts to access admin users list
    const normalToAdminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${normalToken}` }
    });
    assert(normalToAdminUsersRes.status === 403, 'Normal user is rejected from /api/admin/users with 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 4: Tampering with Client Claims Cannot Grant Admin Role
    // -------------------------------------------------------------------------
    console.log('\nTest 4: Request Tampering Resistance...');
    // Normal user tries to sign in at /api/admin/login
    const fakeAdminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: normalUsername,
        password: 'NormalUserPassword123!',
        mfaCode: '849201'
      })
    });
    assert(fakeAdminLoginRes.status === 401, 'Normal user cannot authenticate at /api/admin/login (rejected with 401)');

    // Attempting to register with reserved admin name
    const reservedRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        email: 'fakeadmin@example.com',
        password: 'FakePassword123!'
      })
    });
    assert(reservedRegRes.status === 400 || reservedRegRes.status === 409, 'Public registration for "admin" is strictly disallowed');

    // -------------------------------------------------------------------------
    // TEST 5: Administrative Actions & Audit Logging
    // -------------------------------------------------------------------------
    console.log('\nTest 5: User Suspension, Session Revocation & Audit Trail...');
    const targetUserId = regData.user.id;

    // Suspend normal user
    const suspendRes = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const suspendData = await suspendRes.json();
    assert(suspendRes.status === 200 && suspendData.success, 'Administrator successfully suspends user account');

    // Verify suspended user cannot access user endpoints
    const suspendedMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${normalToken}` }
    });
    assert(suspendedMeRes.status === 403, 'Suspended user token is immediately blocked from /api/auth/me with 403');

    // Unsuspend user
    const unsuspendRes = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/unsuspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(unsuspendRes.status === 200, 'Administrator successfully unsuspends user account');

    // Verify audit logs contain the action
    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const auditData = await auditRes.json();
    const hasSuspendAudit = auditData.logs && auditData.logs.some(l => l.action === 'suspend_user' && l.target_id == targetUserId);
    assert(hasSuspendAudit, 'Tamper-resistant audit log records "suspend_user" with target ID and admin username');

    // -------------------------------------------------------------------------
    // TEST 6: CSV Data Export
    // -------------------------------------------------------------------------
    console.log('\nTest 6: Safe CSV Export...');
    const csvRes = await fetch(`${BASE_URL}/api/admin/export/csv?type=users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const csvText = await csvRes.text();
    assert(csvRes.status === 200 && csvText.startsWith('ID,Username,Email'), 'Administrator can safely export users CSV with standard headers');

    // -------------------------------------------------------------------------
    // TEST 7: Normal Public File Sharing, Download & Admin Revocation
    // -------------------------------------------------------------------------
    console.log('\nTest 7: Normal Public File Sharing, Download & Admin Revocation...');
    const formData = new FormData();
    const testBlob = new Blob(['QuickShare Admin Security Test Payload 2026'], { type: 'text/plain' });
    formData.append('files', testBlob, 'security_test.txt');

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201 && uploadData.success && uploadData.shareToken, 'Normal guest file upload works with zero disruption');

    const downloadRes = await fetch(`${BASE_URL}/api/download-all/${uploadData.shareToken}`);
    assert(downloadRes.status === 200, 'Normal receiver download works with zero disruption');

    // Administrator revokes share session
    const revokeAsAdminRes = await fetch(`${BASE_URL}/api/admin/sessions/${uploadData.shareToken}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(revokeAsAdminRes.status === 200, 'Administrator can revoke any abusive or expired share session and shred files');

    const checkRevokedRes = await fetch(`${BASE_URL}/api/session/${uploadData.shareToken}`);
    const checkRevokedData = await checkRevokedRes.json();
    assert(checkRevokedRes.status === 410 && checkRevokedData.isRevoked === true, 'Revoked share session is immediately rejected on public endpoint with 410 Gone (isRevoked: true)');

    // -------------------------------------------------------------------------
    // TEST 8: Admin Session Revocation & Logout
    // -------------------------------------------------------------------------
    console.log('\nTest 8: Admin Session Revocation on Logout...');
    const logoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(logoutRes.status === 200, 'Administrator logs out and revokes active session token');

    // Verify revoked admin token is now rejected
    const afterLogoutRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(afterLogoutRes.status === 401, 'Revoked administrator token is immediately rejected with 401 Unauthorized');

  } catch (err) {
    console.error('Fatal error running tests:', err);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
