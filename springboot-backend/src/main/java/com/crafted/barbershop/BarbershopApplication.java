package com.crafted.barbershop;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BarbershopApplication {

    public static void main(String[] args) {
        // One agreed timezone for the whole system (LocalDate / LocalTime / LocalDateTime).
        TimeZone.setDefault(TimeZone.getTimeZone(
                System.getenv().getOrDefault("APP_TIMEZONE", "Asia/Manila")));
        SpringApplication.run(BarbershopApplication.class, args);
    }
}
