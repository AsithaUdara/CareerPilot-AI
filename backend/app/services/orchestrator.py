"""Compatibility export — orchestrator lives in app.pipeline."""

from app.pipeline.orchestrator import AgentOrchestrator

__all__ = ["AgentOrchestrator"]
