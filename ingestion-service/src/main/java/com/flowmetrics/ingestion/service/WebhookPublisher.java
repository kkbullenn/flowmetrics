package com.flowmetrics.ingestion.service;

import com.flowmetrics.ingestion.config.RabbitMQConfig;
import com.flowmetrics.ingestion.dto.WorkflowRunPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookPublisher {

    private final RabbitTemplate rabbitTemplate;

    /**
     * Publishes a workflow run payload to the RabbitMQ exchange.
     * The processing service will consume it from the bound queue.
     */
    public void publishWorkflowRun(WorkflowRunPayload payload) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE,
                    RabbitMQConfig.WORKFLOW_RUN_ROUTING_KEY,
                    payload
                                         );

            log.info("Published workflow run event: repo={} run={} conclusion={}",
                     payload.getRepository().getFullName(),
                     payload.getWorkflowRun().getId(),
                     payload.getWorkflowRun().getConclusion()
                    );

        } catch (Exception e) {
            log.error("Failed to publish workflow run event to RabbitMQ: repo={} run={}",
                      payload.getRepository().getFullName(),
                      payload.getWorkflowRun().getId(),
                      e
                     );
            throw e;
        }
    }
}