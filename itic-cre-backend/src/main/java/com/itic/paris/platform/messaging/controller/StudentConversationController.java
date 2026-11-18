package com.itic.paris.platform.messaging.controller;

import com.itic.paris.platform.messaging.model.dtos.ConversationMessageDto;
import com.itic.paris.platform.messaging.model.dtos.ConversationThreadDto;
import com.itic.paris.platform.messaging.model.dtos.MarkReadRequest;
import com.itic.paris.platform.messaging.model.dtos.SendMessageRequest;
import com.itic.paris.platform.messaging.service.ConversationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/conversation/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
@Tag(name = "Messagerie (étudiant)", description = "Le fil de l'étudiant connecté avec l'équipe CRE")
public class StudentConversationController {

    private final ConversationService conversationService;

    @GetMapping
    @Operation(summary = "Mon fil : derniers messages (limit, 50 par défaut, 500 au plus), non-lus, référent. "
            + "Sans message, fil vide (rien n'est créé)")
    public ResponseEntity<ConversationThreadDto> myThread(@RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(conversationService.myThread(limit));
    }

    @PostMapping("/messages")
    @Operation(summary = "Écrire à l'équipe CRE (à tout moment, 4000 caractères au plus) ; crée le fil au premier message")
    public ResponseEntity<ConversationMessageDto> send(@Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(conversationService.sendAsStudent(request.body()));
    }

    @PostMapping("/read")
    @Operation(summary = "Marquer mon fil comme lu jusqu'au message donné (absent : jusqu'au dernier)")
    public ResponseEntity<Void> markRead(@Valid @RequestBody(required = false) MarkReadRequest request) {
        conversationService.markReadAsStudent(request != null ? request.lastMessageId() : null);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Nombre de messages de l'équipe non lus (badge du menu)")
    public ResponseEntity<Long> unreadCount() {
        return ResponseEntity.ok(conversationService.myUnreadCount());
    }
}
