# Alosaur OpenAPI

OpenAPI builder for Alosaur using the classic decorator from @nestjs/swagger

## Why ?

-- TBD --

## Work in progress

- [x] `@ApiTags` - controller class name will be used by default if there is no
      `@ApiTags()` provided at controller or action
- [ ] `@ApiBody` - request body is automatically read from whatever pass to
      `@Body()`, reading from `@ApiBody` will be implemented soon
- [x] `@ApiResponse`
