package com.flowmetrics.ingestion.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Verifies that incoming webhook requests genuinely came from GitHub.
 *
 * GitHub signs every webhook payload with HMAC-SHA256 using your webhook secret
 * and includes the signature in the X-Hub-Signature-256 header as:
 *   sha256=<hex digest>
 *
 * We recompute the HMAC on our side and compare — if they match, the request is legitimate.
 */
@Slf4j
@Component
public class WebhookSignatureVerifier {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SIGNATURE_PREFIX = "sha256=";

    private final byte[] secretBytes;

    public WebhookSignatureVerifier(
            @Value("${flowmetrics.github.webhook-secret}") String webhookSecret) {
        this.secretBytes = webhookSecret.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Returns true if the GitHub signature header matches our computed HMAC of the raw body.
     */
    public boolean isValid(String signatureHeader, byte[] rawBody) {
        if (signatureHeader == null || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
            log.warn("Missing or malformed X-Hub-Signature-256 header");
            return false;
        }

        String expectedHex = signatureHeader.substring(SIGNATURE_PREFIX.length());

        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secretBytes, HMAC_ALGORITHM));
            byte[] computedHash = mac.doFinal(rawBody);
            String computedHex = bytesToHex(computedHash);

            // Use constant-time comparison to prevent timing attacks
            boolean valid = MessageDigest.isEqual(
                    computedHex.getBytes(StandardCharsets.UTF_8),
                    expectedHex.getBytes(StandardCharsets.UTF_8)
                                                 );

            if (!valid) {
                log.warn("Webhook signature mismatch — request may not be from GitHub");
            }

            return valid;

        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Failed to compute HMAC-SHA256", e);
            return false;
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}