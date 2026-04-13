package com.flowmetrics.processing.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class RepositoryDto {
    private UUID id;
    private String fullName;
    private String owner;
    private String name;
    private String defaultBranch;

    public static RepositoryDto from(com.flowmetrics.processing.entity.Repository repo) {
        RepositoryDto dto = new RepositoryDto();
        dto.setId(repo.getId());
        dto.setFullName(repo.getFullName());
        dto.setOwner(repo.getOwner());
        dto.setName(repo.getName());
        dto.setDefaultBranch(repo.getDefaultBranch());
        return dto;
    }
}