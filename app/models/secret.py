from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, new_uuid, utcnow


class Secret(Base):
    """An encrypted secret. The server stores ciphertext only."""

    __tablename__ = "secrets"
    __table_args__ = (UniqueConstraint("team_id", "name", name="uq_secret_team_name"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    team_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("teams.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    ciphertext: Mapped[str] = mapped_column(Text, nullable=False)
    nonce: Mapped[str] = mapped_column(String(32), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    team: Mapped["Team"] = relationship(back_populates="secrets")
    accesses: Mapped[list["SecretAccess"]] = relationship(
        back_populates="secret", cascade="all, delete-orphan"
    )


class SecretAccess(Base):
    """One row per user allowed to read a secret: the DEK wrapped for that user."""

    __tablename__ = "secret_access"
    __table_args__ = (UniqueConstraint("secret_id", "user_id", name="uq_secret_access"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    secret_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("secrets.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    wrapped_key: Mapped[str] = mapped_column(Text, nullable=False)
    granted_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    secret: Mapped["Secret"] = relationship(back_populates="accesses")