package com.flowmetrics.ingestion.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowmetrics.ingestion.dto.WorkflowRunPayload;
import com.flowmetrics.ingestion.security.WebhookSignatureVerifier;
import com.flowmetrics.ingestion.service.WebhookPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookSignatureVerifier signatureVerifier;
    private final WebhookPublisher webhookPublisher;
    private final ObjectMapper objectMapper;

    /**
     * Receives GitHub Actions webhook events.
     *
     * GitHub sends two headers we care about:
     *   X-GitHub-Event       — the event type (e.g. "workflow_run")
     *   X-Hub-Signature-256  — HMAC-SHA256 signature of the raw body
     *
     * We accept the raw body as bytes so we can verify the signature
     * before deserializing — this is important because deserializing
     * an untrusted payload before verifying it is a security risk.
     */
    @PostMapping("/github")
    public ResponseEntity<String> handleGithubWebhook(
            @RequestHeader("X-GitHub-Event") String eventType,
            @RequestHeader("X-Hub-Signature-256") String signature,
            @RequestBody byte[] rawBody
                                                     ) {
        log.debug("Received GitHub webhook: event={}", eventType);

        // Step 1 — verify the signature before doing anything else
        if (!signatureVerifier.isValid(signature, rawBody)) {
            log.warn("Rejected webhook with invalid signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                 .body("Invalid signature");
        }

        // Step 2 — we only care about workflow_run events
        if (!"workflow_run".equals(eventType)) {
            log.debug("Ignoring unsupported event type: {}", eventType);
            return ResponseEntity.ok("Event type ignored");
        }

        // Step 3 — deserialize the payload
        WorkflowRunPayload payload;
        try {
            payload = objectMapper.readValue(rawBody, WorkflowRunPayload.class);
        } catch (Exception e) {
            log.error("Failed to deserialize webhook payload", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                 .body("Invalid payload");
        }

        // Step 4 — only process completed runs (not queued or in_progress)
        if (!"completed".equals(payload.getAction())) {
            log.debug("Ignoring non-completed workflow run action: {}", payload.getAction());
            return ResponseEntity.ok("Action ignored");
        }

        // Step 5 — publish to RabbitMQ for the processing service to handle
        webhookPublisher.publishWorkflowRun(payload);

        return ResponseEntity.ok("Accepted");
    }
}
