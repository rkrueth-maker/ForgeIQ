"""Transferable Business OS Core Engine.

The package is intentionally business-neutral. Highway 38-specific terminology,
catalog data, and branding live in a separate Business Pack.
"""

from .core import (
    ConfigError,
    LicenseError,
    authorization_decision,
    configuration_digest,
    effective_modules,
    migrate_configuration,
    release_gate,
    sign_license,
    validate_configuration,
    verify_license,
)
from .installer import (
    BackupError,
    InstallationError,
    build_install_plan,
    create_backup,
    install_business_os,
    restore_backup,
    verify_installation,
)
from .concept_builder import build_business_concept

__all__ = [
    "BackupError",
    "ConfigError",
    "InstallationError",
    "LicenseError",
    "authorization_decision",
    "build_business_concept",
    "build_install_plan",
    "configuration_digest",
    "create_backup",
    "effective_modules",
    "install_business_os",
    "migrate_configuration",
    "release_gate",
    "restore_backup",
    "sign_license",
    "validate_configuration",
    "verify_installation",
    "verify_license",
]
