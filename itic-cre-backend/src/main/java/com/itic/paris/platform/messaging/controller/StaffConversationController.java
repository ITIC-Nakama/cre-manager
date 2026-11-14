package com.itic.paris.platform.messaging.controller;

import com.itic.paris.platform.messaging.model.dtos.ConversationMessageDto;
import com.itic.paris.platform.messaging.model.dtos.ConversationSummaryDto;
import com.itic.paris.platform.messaging.model.dtos.ConversationThreadDto;
import com.itic.paris.platform.messaging.model.dtos.MarkReadRequest;
import com.itic.paris.platform.messaging.model.dtos.SendMessageRequest;
import com.itic.paris.platform.messaging.model.dtos.UnreadCountsDto;
import com.itic.paris.platform.messaging.service.ConversationScope;
import com.itic.paris.platform.messaging.service.ConversationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/dashboard/conversations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
@Tag(name = "Messagerie (équipe)", description = "Fils des étudiants, partagés par tous les conseillers et admins")
public class StaffConversationController {

    private final ConversationService conversationService;

    @GetMapping
    @Operation(summary = "Fils, du plus récent au plus ancien : scope MINE (mes étudiants) ou ALL (tous, par défaut), "
            + "unread=true (un message de l'étudiant non lu), q (nom, prénom ou e-mail ; sans accents ni majuscules)")
    public ResponseEntity<Page<ConversationSummaryDto>> list(
            @RequestParam(defaultValue = "ALL") ConversationScope scope,
            @RequestParam(defaultValue = "false") boolean unread,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(conversationService.list(scope, unread, q, pageable));
    }

    @GetMapping("/unread-counts")
    @Operation(summary = "Fils non lus : badge du menu (mes étudiants et étudiants sans référent), « Mes étudiants », « Tous »")
    public ResponseEntity<UnreadCountsDto> unreadCounts() {
        return ResponseEntity.ok(conversationService.unreadCounts());
    }

    @GetMapping("/students/{studentId}")
    @Operation(summary = "Fil d'un étudiant (limit, 50 par défaut, 500 au plus) ; sans message, fil vide (rien n'est créé)")
    public ResponseEntity<ConversationThreadDto> thread(@PathVariable UUID studentId,
                                                        @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(conversationService.studentThread(studentId, limit));
    }

    @PostMapping("/students/{studentId}/messages")
    @Operation(summary = "Écrire à un étudiant (4000 caractères au plus) ; 409 si son compte est désactivé")
    public ResponseEntity<ConversationMessageDto> send(@PathVariable UUID studentId,
                                                       @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(conversationService.sendAsStaff(studentId, request.body()));
    }

    @PostMapping("/students/{studentId}/read")
    @Operation(summary = "Marquer le fil comme lu (pour moi seulement) jusqu'au message donné (absent : jusqu'au dernier)")
    public ResponseEntity<Void> markRead(@PathVariable UUID studentId,
                                         @Valid @RequestBody(required = false) MarkReadRequest request) {
        conversationService.markReadAsStaff(studentId, request != null ? request.lastMessageId() : null);
        return ResponseEntity.noContent().build();
    }
}
