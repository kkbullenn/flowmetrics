package com.flowmetrics.ingestion.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.Instant;

// GitHub sends a lot of fields we don't need — ignoring unknowns keeps this clean
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WorkflowRunPayload {

    // "completed", "requested", "in_progress"
    private String action;

    @JsonProperty("workflow_run")
    private WorkflowRun workflowRun;

    private Repository repository;

    // ─────────────────────────────────────────
    // Nested: workflow_run object
    // ─────────────────────────────────────────
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WorkflowRun {
        private Long id;

        private String name;

        @JsonProperty("run_number")
        private Integer runNumber;

        @JsonProperty("head_branch")
        private String headBranch;

        @JsonProperty("head_sha")
        private String headSha;

        private String event;

        private String status;

        private String conclusion;

        @JsonProperty("run_started_at")
        private Instant runStartedAt;

        @JsonProperty("updated_at")
        private Instant updatedAt;

        // The commit that triggered this run
        @JsonProperty("head_commit")
        private HeadCommit headCommit;
    }

    // ─────────────────────────────────────────
    // Nested: head_commit object
    // ─────────────────────────────────────────
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HeadCommit {
        private String id;      // commit SHA
        private String message;
        private Instant timestamp;

        private Author author;

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Author {
            private String name;
            private String email;
        }
    }

    // ─────────────────────────────────────────
    // Nested: repository object
    // ─────────────────────────────────────────
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Repository {
        private Long id;

        @JsonProperty("full_name")
        private String fullName;

        private String name;

        private Owner owner;

        @JsonProperty("default_branch")
        private String defaultBranch;

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Owner {
            private String login;
        }
    }
}
