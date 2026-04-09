package com.flowmetrics.processing.repository;

import com.flowmetrics.processing.entity.Commit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommitRepository extends JpaRepository<Commit, UUID> {
    Optional<Commit> findByRepositoryIdAndSha(UUID repositoryId, String sha);
}