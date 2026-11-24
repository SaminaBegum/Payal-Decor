## Summary
<!-- Provide a brief description of the changes introduced by this PR -->

## Type of Change
<!-- Select the relevant type matching your Conventional Commit title: -->
- [ ] `feat`: New feature or module enhancement
- [ ] `fix`: Bug fix
- [ ] `refactor`: Code refactoring without behavior change
- [ ] `perf`: Performance optimization
- [ ] `docs`: Documentation changes
- [ ] `test`: Adding or updating tests
- [ ] `ci`: CI/CD pipeline or workflow changes
- [ ] `chore`: Tooling, dependencies, or maintenance

## PR Title Convention
> Ensure your PR title adheres to Conventional Commits:  
> `type(scope): lowercase description` (e.g. `feat(purchase): add purchase orders api` or `fix: resolve login redirect`)

## Verification Checklist
- [ ] Unit & integration tests pass (`npm test`)
- [ ] TypeScript typecheck clean (`npm run typecheck --prefix modulaflow-erp-main`)
- [ ] ESLint clean (`npm run lint`)
- [ ] No hardcoded credentials or secrets
