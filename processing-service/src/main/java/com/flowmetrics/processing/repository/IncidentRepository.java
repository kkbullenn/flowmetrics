package com.flowmetrics.processing.repository;

import com.flowmetrics.processing.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    // Find an open (unresolved) incident for a given repo + environment
    Optional<Incident> findTopByRepositoryIdAndEnvironmentAndResolvedAtIsNullOrderByDetectedAtDesc(
            UUID repositoryId, String environment);
}