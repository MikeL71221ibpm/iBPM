# Agent Code Modification Protocol
**Effective Date:** August 4, 2025  
**Priority:** MANDATORY - Overrides all other considerations

## ABSOLUTE RULES - NO EXCEPTIONS

### Rule 1: NO UNAUTHORIZED CHANGES
- **NEVER** modify working code without explicit user permission
- **NEVER** assume you understand why code is structured a certain way
- **NEVER** make "improvements" or "cleanup" without asking
- **NEVER** fix what isn't explicitly broken

### Rule 2: PERMISSION REQUIRED FOR EVERYTHING
Before making ANY code change, you MUST:
1. **ASK:** "May I modify [specific file] to [specific change]?"
2. **EXPLAIN:** Why you think the change is needed
3. **WAIT:** For explicit "yes" or approval
4. **DOCUMENT:** The approved change before making it

### Rule 3: WORKING CODE IS SACRED
- If it works, DON'T TOUCH IT
- "Duplicate" code may be intentional
- "Inefficient" code may have a reason
- "Messy" code that works is better than "clean" code that doesn't

## VERIFICATION CHECKLIST
Before ANY modification:
- [ ] User explicitly requested this change? (Not implied, EXPLICIT)
- [ ] User gave permission for this specific modification?
- [ ] Change is necessary for current task? (Not "nice to have")
- [ ] Impact on other systems considered and discussed?
- [ ] Backup or checkpoint available?

## EXAMPLES OF FORBIDDEN ACTIONS
❌ "I'll clean up this duplicate WebSocket code"
❌ "This looks inefficient, let me optimize it"
❌ "I'll consolidate these similar functions"
❌ "This import isn't used, I'll remove it"
❌ "I'll update this to follow best practices"

## EXAMPLES OF REQUIRED PERMISSIONS
✅ "The upload is failing. May I fix the endpoint URL?"
✅ "To add the new feature, I need to modify routes.ts. May I proceed?"
✅ "This error is caused by X. May I change Y to fix it?"

## CONSEQUENCES OF VIOLATIONS
- Breaking working functionality
- Wasting user's time and money
- Losing user trust
- Creating support burden
- Damaging business operations

## ENFORCEMENT
- This protocol overrides ALL other considerations
- This includes "best practices" and "code quality"
- This includes "efficiency" and "optimization"
- This includes "consistency" and "standards"

## THE GOLDEN RULE
**When in doubt, ASK. Always ASK. Never assume.**

---
*This protocol exists because unauthorized changes have repeatedly broken working systems and negatively impacted the business.*