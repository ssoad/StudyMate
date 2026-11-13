package org.armorclub.studymate.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseEnrollment
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.ui.theme.AppTheme
import org.armorclub.studymate.ui.theme.Radius
import org.armorclub.studymate.ui.theme.Spacing

/**
 * Where students send course fees. Keep in sync with the web app's src/lib/paymentAccounts.ts.
 * PLACEHOLDER VALUES — replace with the real receiving accounts before relying on them.
 */
enum class PaymentMethodType(
    val title: String,
    val typeLabel: String,
    val accountNumber: String,
    val cleanNumber: String,
    /** Steps shown to the student; "{amount}" is replaced with the course fee. */
    val steps: List<String>
) {
    BKASH(
        title = "bKash",
        typeLabel = "Personal · Send Money",
        accountNumber = "01712-345678",
        cleanNumber = "01712345678",
        steps = listOf(
            "Open the bKash app or dial *247#",
            "Choose Send Money",
            "Send {amount} to the number above",
            "Copy the Transaction ID (TrxID) and enter it below"
        )
    ),
    NAGAD(
        title = "Nagad",
        typeLabel = "Personal · Send Money",
        accountNumber = "01812-345678",
        cleanNumber = "01812345678",
        steps = listOf(
            "Open the Nagad app or dial *167#",
            "Choose Send Money",
            "Send {amount} to the number above",
            "Copy the Transaction ID (TrxID) and enter it below"
        )
    ),
    ROCKET(
        title = "Rocket",
        typeLabel = "Personal · Send Money",
        accountNumber = "01912-345678-9",
        cleanNumber = "019123456789",
        steps = listOf(
            "Open the Rocket app or dial *322#",
            "Choose Send Money",
            "Send {amount} to the 12-digit number above",
            "Copy the Transaction ID (TrxID) and enter it below"
        )
    ),
    BANK(
        title = "Bank",
        typeLabel = "City Bank · StudyMate Academy BD",
        accountNumber = "2301987654001",
        cleanNumber = "2301987654001",
        steps = listOf(
            "City Bank Ltd, Gulshan Branch, Dhaka · Routing 225261328",
            "Transfer {amount} via internet banking, BEFTN, NPSB or a counter deposit",
            "Enter your deposit reference below as the Transaction ID"
        )
    )
}

private fun taka(amount: Double): String = "৳" + "%,d".format(amount.toInt())

@Composable
fun EnrollmentDialog(
    course: Course,
    userId: String,
    enrollmentRepository: EnrollmentRepository,
    onDismiss: () -> Unit,
    onSuccess: (CourseEnrollment) -> Unit
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    var method by remember { mutableStateOf(PaymentMethodType.BKASH) }
    var senderNumber by remember { mutableStateOf("") }
    var transactionId by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var submitted by remember { mutableStateOf<CourseEnrollment?>(null) }

    val price = course.price ?: 0.0
    val c = AppTheme.colors

    Dialog(
        onDismissRequest = { if (!submitting) onDismiss() },
        properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = false)
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .imePadding()
                .padding(Spacing.md),
            contentAlignment = Alignment.Center
        ) {
            Column(
                Modifier
                    .widthIn(max = 520.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(Radius.sheet))
                    .background(c.surfaceElevated)
                    .verticalScroll(rememberScrollState())
                    .padding(Spacing.lg)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (submitted != null) "Payment submitted" else "Enroll",
                            style = MaterialTheme.typography.titleLarge,
                            color = c.textPrimary
                        )
                        Text(course.title, style = MaterialTheme.typography.bodySmall, color = c.textSecondary, maxLines = 1)
                    }
                    IconButton(onClick = onDismiss, enabled = !submitting) {
                        Icon(Icons.Outlined.Close, contentDescription = "Close", tint = c.textSecondary)
                    }
                }
                Spacer(Modifier.height(Spacing.md))

                val done = submitted
                if (done != null) {
                    SubmittedState(done, course.title) {
                        onSuccess(done)
                        onDismiss()
                    }
                    return@Column
                }

                // Amount
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(Radius.control))
                        .background(c.surfaceVariant)
                        .padding(Spacing.md),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Course fee", style = MaterialTheme.typography.bodyMedium, color = c.textSecondary, modifier = Modifier.weight(1f))
                    Text(taka(price), style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
                }

                Spacer(Modifier.height(Spacing.md))
                Text("1. Send the fee", style = MaterialTheme.typography.titleSmall, color = c.textPrimary)
                Spacer(Modifier.height(Spacing.xs))
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    PaymentMethodType.entries.forEach { m ->
                        FilterPill(m.title, selected = method == m, onClick = { method = m })
                    }
                }
                Spacer(Modifier.height(Spacing.sm))
                SmCard(padding = Spacing.md) {
                    Text(method.typeLabel, style = MaterialTheme.typography.bodySmall, color = c.textSecondary)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            method.accountNumber,
                            style = MaterialTheme.typography.titleMedium.copy(fontFamily = FontFamily.Monospace),
                            color = c.textPrimary,
                            modifier = Modifier.weight(1f)
                        )
                        GhostButton("Copy", icon = Icons.Outlined.ContentCopy, onClick = {
                            clipboard.setText(AnnotatedString(method.cleanNumber))
                            Toast.makeText(context, "${method.title} number copied", Toast.LENGTH_SHORT).show()
                        })
                    }
                    Spacer(Modifier.height(Spacing.xs))
                    method.steps.forEachIndexed { i, step ->
                        Row(Modifier.padding(vertical = 2.dp)) {
                            Text("${i + 1}.", style = MaterialTheme.typography.bodySmall, color = c.textMuted, modifier = Modifier.width(18.dp))
                            Text(step.replace("{amount}", taka(price)), style = MaterialTheme.typography.bodySmall, color = c.textSecondary)
                        }
                    }
                    course.paymentInstructions?.takeIf { it.isNotBlank() }?.let {
                        Spacer(Modifier.height(Spacing.xs))
                        Text(it, style = MaterialTheme.typography.bodySmall, color = c.textPrimary)
                    }
                }

                Spacer(Modifier.height(Spacing.md))
                Text("2. Tell us about the payment", style = MaterialTheme.typography.titleSmall, color = c.textPrimary)
                Spacer(Modifier.height(Spacing.xs))
                DialogField(
                    value = senderNumber,
                    onValueChange = { senderNumber = it; error = null },
                    label = "Number you sent from",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next)
                )
                Spacer(Modifier.height(Spacing.xs))
                DialogField(
                    value = transactionId,
                    onValueChange = { transactionId = it.trim(); error = null },
                    label = "Transaction ID (TrxID)",
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, imeAction = ImeAction.Next)
                )
                Spacer(Modifier.height(Spacing.xs))
                DialogField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = "Note for the admin (optional)",
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done)
                )

                error?.let {
                    Spacer(Modifier.height(Spacing.xs))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = c.error)
                }

                Spacer(Modifier.height(Spacing.md))
                if (submitting) {
                    Box(Modifier.fillMaxWidth().height(44.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = c.primary, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
                    }
                } else {
                    PrimaryButton(
                        text = "Submit payment",
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            when {
                                senderNumber.isBlank() -> error = "Enter the number you sent the payment from."
                                transactionId.length < 4 -> error = "Enter the Transaction ID from your payment receipt."
                                else -> {
                                    submitting = true
                                    scope.launch {
                                        enrollmentRepository.submitEnrollment(
                                            courseId = course.id,
                                            userId = userId,
                                            paymentMethod = method.title,
                                            senderNumber = senderNumber.trim(),
                                            transactionId = transactionId,
                                            amount = price,
                                            studentNotes = notes.trim()
                                        ).onSuccess { submitted = it }
                                            .onFailure { error = it.message ?: "Couldn't submit. Check your connection and try again." }
                                        submitting = false
                                    }
                                }
                            }
                        }
                    )
                }
                Spacer(Modifier.height(Spacing.xs))
                Text(
                    "An admin checks the payment and unlocks the course, usually within an hour.",
                    style = MaterialTheme.typography.bodySmall,
                    color = c.textMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
private fun SubmittedState(item: CourseEnrollment, courseTitle: String, onDone: () -> Unit) {
    val c = AppTheme.colors
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = c.success, modifier = Modifier.size(40.dp))
        Spacer(Modifier.height(Spacing.xs))
        Badge("Waiting for approval", tone = BadgeTone.Warning)
        Spacer(Modifier.height(Spacing.md))
        SmCard(padding = Spacing.md) {
            SummaryLine("Course", courseTitle)
            SummaryLine("Method", item.paymentMethod)
            SummaryLine("Sent from", item.senderNumber)
            SummaryLine("TrxID", item.transactionId, mono = true)
            SummaryLine("Amount", taka(item.amount))
        }
        Spacer(Modifier.height(Spacing.sm))
        Text(
            "We'll unlock every lesson and file as soon as the payment is verified.",
            style = MaterialTheme.typography.bodySmall,
            color = c.textSecondary,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(Spacing.md))
        PrimaryButton("Done", onClick = onDone, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun SummaryLine(label: String, value: String, mono: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.textSecondary, modifier = Modifier.width(88.dp))
        Text(
            value,
            style = MaterialTheme.typography.bodySmall.let { if (mono) it.copy(fontFamily = FontFamily.Monospace) else it },
            color = AppTheme.colors.textPrimary,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun DialogField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardOptions: KeyboardOptions
) {
    val c = AppTheme.colors
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = keyboardOptions,
        shape = RoundedCornerShape(Radius.control),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = c.primary,
            unfocusedBorderColor = c.cardBorder,
            focusedLabelColor = c.primary,
            unfocusedLabelColor = c.textMuted,
            focusedTextColor = c.textPrimary,
            unfocusedTextColor = c.textPrimary,
            cursorColor = c.primary,
            focusedContainerColor = Color.Transparent,
            unfocusedContainerColor = Color.Transparent
        ),
        modifier = Modifier.fillMaxWidth()
    )
}
