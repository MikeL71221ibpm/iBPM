# Version Management Guidelines

## Version Naming Convention

The IBPM application follows semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Significant changes that might affect compatibility (v3.0.0)
- **MINOR**: New features that maintain backward compatibility (v3.1.0)
- **PATCH**: Bug fixes and minor improvements (v3.0.1)

## File Naming Convention

To distinguish between different versions, we use the following naming conventions:

### For Component Files
- Base components (v3.0): `component-name-controlling-file-MM_DD_YY.tsx`
- New version components (v3.1+): `component-name-v3-1-MM_DD_YY.tsx`

### For Page Files
- Base pages (v3.0): `page-name-controlling-MM_DD_YY.tsx`
- New version pages (v3.1+): `page-name-v3-1-MM_DD_YY.tsx`

## Version Tracking

1. All changes are documented in `VERSION.md`
2. Each release creates a snapshot in the `/project_snapshot_MM_DD_YYYY` directory
3. When making improvements, always start with the most recent controlling file
4. Comment at the top of each file should indicate the version number

## Deployment Process

For new version deployments:
1. Create a complete snapshot of the current state (v3.0)
2. Implement and test all v3.1 changes
3. Update VERSION.md with detailed changelog
4. Create v3.1 snapshot upon successful deployment