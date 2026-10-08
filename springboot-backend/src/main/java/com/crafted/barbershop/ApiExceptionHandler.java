package com.crafted.barbershop;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

// One consistent JSON error shape: { "error": "..." }
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> conflict(DataIntegrityViolationException e) {
        return Api.err(HttpStatus.CONFLICT,
            "That change conflicts with existing data (for example, an item that still has bookings).");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> badBody(HttpMessageNotReadableException e) {
        return Api.err(HttpStatus.BAD_REQUEST, "The request body is missing or not valid.");
    }

    // Profile picture uploads: a file over the size limit, or a request with no file in it
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> tooLarge(MaxUploadSizeExceededException e) {
        return Api.err(HttpStatus.PAYLOAD_TOO_LARGE, "That image is larger than 5 MB.");
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, Object>> noFile(MissingServletRequestPartException e) {
        return Api.err(HttpStatus.BAD_REQUEST, "Choose an image to upload.");
    }
}
