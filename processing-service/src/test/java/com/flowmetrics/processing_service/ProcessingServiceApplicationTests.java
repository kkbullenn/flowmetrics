package com.flowmetrics.processing_service;

import com.flowmetrics.processing.ProcessingServiceApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = ProcessingServiceApplication.class)
@ActiveProfiles("test")
class ProcessingServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}