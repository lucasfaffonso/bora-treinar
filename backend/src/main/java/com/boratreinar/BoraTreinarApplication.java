package com.boratreinar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BoraTreinarApplication {

    public static void main(String[] args) {
        SpringApplication.run(BoraTreinarApplication.class, args);
    }
}
