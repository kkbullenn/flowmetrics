package com.flowmetrics.processing.consumer;

import com.flowmetrics.processing.dto.WorkflowRunPayload;
import com.flowmetrics.processing.service.WorkflowRunProcessingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowRunConsumer {

    private final WorkflowRunProcessingService processingService;

    @RabbitListener(queues = "#{T(com.flowmetrics.processing.config.RabbitMQConfig).WORKFLOW_RUN_QUEUE}")
    public void consume(WorkflowRunPayload payload) {
        log.debug("Consumed message from queue: repo={} run={}",
                payload.getRepository().getFullName(),
                payload.getWorkflowRun().getId());
        try {
            processingService.process(payload);
        } catch (Exception e) {
            log.error("Failed to process workflow run: repo={} run={}",
                    payload.getRepository().getFullName(),
                    payload.getWorkflowRun().getId(),
                    e);
            throw e;
        }
    }
}