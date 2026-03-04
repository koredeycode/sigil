# Sigil Code Fix Instructions

**Generated:** March 4, 2026  
**Total Fixes:** 27

This directory contains step-by-step instructions for fixing issues identified in the comprehensive code review. Each fix is in a separate file to avoid overwhelming the agent and allow for focused, incremental improvements.

## 📁 Directory Structure

```
instructions/
├── README.md           # This file - overview and guidance
├── critical/           # 🔴 Fix these FIRST (4 fixes)
├── high/              # 🟠 Fix these SECOND (6 fixes)
├── medium/            # 🟡 Fix these THIRD (10 fixes)
├── low/               # 🟢 Fix these LAST (7 fixes)
├── TESTING.md         # Testing checklist
└── DEPLOYMENT.md      # Deployment guide
```

## 🎯 How to Use These Instructions

### For AI Agents:
1. Start with `critical/` directory
2. Process files in numerical order (01, 02, 03, 04)
3. Complete all critical fixes before moving to high priority
4. After each fix:
   - Run `pnpm build` to verify no build errors
   - Commit the change
   - Mark the fix as complete
5. Move to next priority level

### For Human Developers:
1. Review all files in current priority level
2. Choose the fix you want to implement
3. Follow step-by-step instructions in that file
4. Test thoroughly before moving to next fix
5. Consider doing related fixes together if they touch the same files

## 📋 Priority Levels

### 🔴 CRITICAL (Start Here)
**Files:** `critical/01-*.md` through `critical/04-*.md`

These are security and type safety issues that MUST be fixed first:
- TypeScript type checking disabled
- Excessive console logging (security risk)
- Unsafe `any` type usage
- Missing input validation

**Time Estimate:** 4-8 hours

---

### 🟠 HIGH PRIORITY (Do Second)
**Files:** `high/05-*.md` through `high/10-*.md`

These are architectural and reliability issues that should be fixed soon:
- Missing rate limiting
- Database transaction safety
- Error handling standardization
- Configuration improvements
- Timeout handling
- Memory management

**Time Estimate:** 6-10 hours

---

### 🟡 MEDIUM PRIORITY (Do Third)
**Files:** `medium/11-*.md` through `medium/19-*.md`

These are consistency and maintenance issues:
- Dependency alignment
- Code cleanup
- Connection management
- Documentation
- Architecture improvements

**Time Estimate:** 4-8 hours

---

### 🟢 LOW PRIORITY (Do Last)
**Files:** `low/20-*.md` through `low/23-*.md`

These are code quality improvements:
- Naming conventions
- Documentation enhancements
- Configuration examples
- Health check improvements

**Time Estimate:** 2-4 hours

---

## ✅ Progress Tracking

Create a checklist to track your progress:

### Critical Fixes
- [ ] 01 - Remove TypeScript type checking bypass
- [ ] 02 - Implement proper logger
- [ ] 03 - Replace `any` types
- [ ] 04 - Add input validation

### High Priority Fixes
- [ ] 05 - Implement rate limiting
- [ ] 06 - Add database transactions
- [ ] 07 - Standardize error handling
- [ ] 08 - Make server URL configurable
- [ ] 09 - Add LLM timeouts
- [ ] 10 - Add cache size limit

### Medium Priority Fixes
- [ ] 11 - Align dependency versions
- [ ] 12 - Remove test files
- [ ] 13 - Remove circular dependency
- [ ] 14 - Improve socket connection
- [ ] 15 - Clean commented code
- [ ] 16 - Extract magic numbers
- [ ] 17 - Add JSDoc documentation
- [ ] 18 - Improve path resolution
- [ ] 19 - Add error boundaries

### Low Priority Fixes
- [ ] 20 - Improve naming consistency
- [ ] 21 - Add TypeScript config comments
- [ ] 22 - Add environment documentation
- [ ] 23 - Enhance health check

---

## 🔧 General Guidelines

### Before Starting:
1. **Backup:** Create backup of `~/.sigil/` directory
2. **Branch:** Create a new git branch: `git checkout -b code-review-fixes`
3. **Clean State:** Ensure no uncommitted changes: `git status`

### While Working:
1. **One Fix at a Time:** Complete one fix fully before starting next
2. **Test After Each Fix:** Run `pnpm build` and relevant tests
3. **Commit Often:** Commit working code with descriptive messages
4. **Read Carefully:** Each instruction file is self-contained

### After Each Fix:
```bash
# Build to check for errors
pnpm build

# Run tests (if available)
pnpm test

# Commit the change
git add .
git commit -m "fix: [description of what was fixed]"
```

### If Something Breaks:
1. Read error messages carefully
2. Check if you missed a step in the instructions
3. Verify file paths are correct
4. Consider reverting and trying again: `git checkout -- <file>`

---

## 📊 Estimated Total Time

- **Critical Fixes:** 4-8 hours
- **High Priority:** 6-10 hours  
- **Medium Priority:** 4-8 hours
- **Low Priority:** 2-4 hours

**Total:** 16-30 hours (depends on experience level)

Can be split across multiple days/sessions.

---

## 🚨 Important Notes

1. **Database Safety:** The database format doesn't change, but back it up first
2. **Breaking Changes:** Some fixes may require updating client code
3. **Dependencies:** Some fixes add new npm packages - review them first
4. **TypeScript Errors:** After removing `@ts-nocheck`, expect many type errors to fix
5. **Testing:** Manual testing is required - automated tests don't exist yet

---

## 🆘 Need Help?

If you get stuck:
1. Check the specific instruction file for troubleshooting tips
2. Review the original code review report (main INSTRUCTIONS.md)
3. Check git history to see what changed
4. Consider skipping to next fix and returning later

---

## 📚 Additional Resources

- See `TESTING.md` for comprehensive testing checklist
- See `DEPLOYMENT.md` for deployment steps
- See main `INSTRUCTIONS.md` for complete context
- See code review report for detailed issue explanations

---

**Ready to start?** Go to `critical/01-remove-ts-nocheck.md` and begin!
