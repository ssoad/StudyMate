package org.armorclub.studymate.data.model

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Shapes taken from server.js /auth/v1/token and /auth/v1/signup responses. */
class AuthResponseTest {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    @Test
    fun `password sign-in response with metadata arrays decodes`() {
        val body = """
            {"access_token":"abc","token_type":"bearer","expires_in":2592000,"refresh_token":"abc",
             "user":{"id":"u1","aud":"authenticated","role":"authenticated","email":"a@b.c",
               "app_metadata":{"provider":"email","providers":["email"],"role":"admin"},
               "user_metadata":{"full_name":"Ada","avatar_url":null,"role":"admin"},
               "created_at":"2026-01-01T00:00:00Z"}}
        """.trimIndent()
        val resp = json.decodeFromString<AuthTokenResponse>(body)
        assertEquals("abc", resp.accessToken)
        assertEquals("admin", resp.user?.appMeta("role"))
        assertEquals("Ada", resp.user?.userMeta("full_name"))
        assertNull(resp.user?.userMeta("avatar_url"))
        assertNull(resp.user?.appMeta("providers"))
    }

    @Test
    fun `signup response decodes`() {
        val body = """{"access_token":"t","user":{"id":"u2","email":"x@y.z","app_metadata":{"provider":"email"},"user_metadata":{"full_name":"X"}}}"""
        val resp = json.decodeFromString<AuthTokenResponse>(body)
        assertEquals("u2", resp.user?.id)
        assertEquals("X", resp.user?.userMeta("full_name"))
    }

    @Test
    fun `error response decodes`() {
        val body = """{"error":"invalid_grant","error_description":"Invalid login credentials","message":"Invalid login credentials"}"""
        assertEquals("Invalid login credentials", json.decodeFromString<AuthTokenResponse>(body).errorDescription)
    }

    @Test
    fun `profile row decodes`() {
        val rows = json.decodeFromString<List<ProfileRow>>("""[{"full_name":"Ada","points":340}]""")
        assertEquals(340, rows.single().points)
    }
}
