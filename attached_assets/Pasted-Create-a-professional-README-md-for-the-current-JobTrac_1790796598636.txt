Create a professional README.md for the current JobTrack project.

IMPORTANT:
- Do not change any application code.
- Do not change the UI.
- Do not add features.
- Do not change dependencies.
- Do not add Clerk.
- Do not add Routines.
- Only create or update README.md.
- Base all information strictly on the actual current project implementation. Do not invent technologies, features, endpoints, or architecture.

The README should include:

1. Project title: JobTrack

2. Short project description:
   Explain that JobTrack is a job application tracking platform that helps users manage applications and analyze job-related Gmail messages with AI.

3. Key features:
   - Application CRUD
   - PostgreSQL persistence
   - Dashboard statistics
   - Gmail read-only integration
   - AI-powered job email analysis
   - Review/edit extracted application information
   - Explicit Add to JobTrack flow
   - Duplicate application/import protection

4. Tech stack:
   Inspect the actual project and list the technologies currently used for:
   - Frontend
   - Backend
   - Database
   - ORM
   - Gmail integration
   - AI integration
   - Development/deployment tools

5. Architecture:
   Explain the actual frontend → backend/API → database flow and Gmail → AI → review → application flow.

6. Database:
   Explain that PostgreSQL is the source of truth and that Drizzle is used for database access/migrations.

7. Gmail integration:
   Explain the current read-only development-preview setup accurately.
   Mention that Gmail messages are not sent, deleted, or modified.
   Do not claim that each public visitor has their own Gmail OAuth connection.

8. AI analysis:
   Explain how the current AI email analysis works.
   Mention that it runs server-side.
   Mention the actual AI service/model used by the project.
   Explain that the user reviews extracted information before adding it.

9. Duplicate prevention:
   Explain the actual duplicate detection/provenance mechanism implemented in the project.

10. Security:
   Explain that secrets are kept server-side/environment-based and excluded through .gitignore.
   Do not expose or write any actual secrets or credentials in the README.

11. API:
   Document the actual application API endpoints by inspecting the current backend.
   Only document endpoints that actually exist.

12. Testing:
   Summarize the actual tests and verification that have been performed.
   Do not claim tests that were not actually run.

13. Local development:
   Provide accurate setup instructions based on the current project.
   Inspect package.json/pnpm configuration and actual project structure before writing commands.
   Explain required environment variables without including secret values.

14. Current limitations:
   Mention accurately that:
   - Gmail integration is currently development-preview only.
   - Authentication/multi-user access is not currently implemented.
   - Clerk is not part of the current MVP.
   - Automated routines are not part of the current MVP.

15. Future improvements:
   Keep this short and realistic.

16. Project status:
   State that this is the current JobTrack MVP.

README style:
- Professional GitHub README.
- Clear headings.
- Concise but informative.
- Use tables where useful.
- Include Mermaid diagrams only if they accurately represent the current architecture.
- Do not include fake screenshots, badges, links, or statistics.
- Do not include a license unless one actually exists in the repository.

After creating README.md:
- Verify it accurately matches the current codebase.
- Show me a concise summary of what was added.
- Do not commit or push anything yet.