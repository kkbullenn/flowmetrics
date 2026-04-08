package com.flowmetrics.ingestion.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Exchange — ingestion service publishes here
    public static final String EXCHANGE = "flowmetrics.exchange";

    // Queue — processing service consumes from here
    public static final String WORKFLOW_RUN_QUEUE = "flowmetrics.workflow-runs";

    // Routing key — connects the exchange to the queue
    public static final String WORKFLOW_RUN_ROUTING_KEY = "workflow.run.completed";

    @Bean
    public TopicExchange flowmetricsExchange() {
        return ExchangeBuilder
                .topicExchange(EXCHANGE)
                .durable(true)
                .build();
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }

    @Bean
    public Queue workflowRunQueue() {
        return QueueBuilder
                .durable(WORKFLOW_RUN_QUEUE)
                .build();
    }

    @Bean
    public Binding workflowRunBinding(Queue workflowRunQueue, TopicExchange flowmetricsExchange) {
        return BindingBuilder
                .bind(workflowRunQueue)
                .to(flowmetricsExchange)
                .with(WORKFLOW_RUN_ROUTING_KEY);
    }

    // Serialize messages as JSON instead of Java serialization
    @Bean
    public org.springframework.amqp.support.converter.MessageConverter messageConverter() {
        return new org.springframework.amqp.support.converter.Jackson2JsonMessageConverter(
                new ObjectMapper().findAndRegisterModules()
        );
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}
