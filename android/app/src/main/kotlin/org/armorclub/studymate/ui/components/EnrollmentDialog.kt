package org.armorclub.studymate.ui.components

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch
import org.armorclub.studymate.data.model.Course
import org.armorclub.studymate.data.model.CourseEnrollment
import org.armorclub.studymate.data.repository.EnrollmentRepository
import org.armorclub.studymate.ui.theme.AppTheme

enum class PaymentMethodType(
    val title: String,
    val brandColor: Color,
    val typeLabel: String,
    val accountNumber: String,
    val cleanNumber: String,
    val instructions: List<String>
) {
    BKASH(
        title = "bKash",
        brandColor = Color(0xFFE2136E),
        typeLabel = "Personal (Send Money)",
        accountNumber = "01712-345678",
        cleanNumber = "01712345678",
        instructions = listOf(
            "Open your bKash app or dial *247#",
            "Choose \"Send Money\" (Personal)",
            "Enter receiver number: 01712345678",
            "Enter course fee amount: ৳2,500",
            "Put reference: Your Name or Course ID",
            "Save the Transaction ID (TrxID) and enter it below"
        )
    ),
    NAGAD(
        title = "Nagad",
        brandColor = Color(0xFFF7941D),
        typeLabel = "Personal (Send Money)",
        accountNumber = "01812-345678",
        cleanNumber = "01812345678",
        instructions = listOf(
            "Open your Nagad app or dial *167#",
            "Choose \"Send Money\"",
            "Enter receiver number: 01812345678",
            "Enter course fee amount: ৳2,500",
            "Enter your PIN and complete transaction",
            "Copy the Transaction ID (TrxID) and enter it below"
        )
    ),
    ROCKET(
        title = "Rocket",
        brandColor = Color(0xFF8C3494),
        typeLabel = "Personal (Send Money)",
        accountNumber = "01912-345678-9",
        cleanNumber = "019123456789",
        instructions = listOf(
            "Open Rocket App or dial *322#",
            "Select \"Send Money\"",
            "Enter 12-digit receiver number: 019123456789",
            "Enter course fee amount: ৳2,500",
            "Enter your PIN and confirm",
            "Note the TrxID and enter it below"
        )
    ),
    BANK(
        title = "Bank",
        brandColor = Color(0xFF0284C7),
        typeLabel = "Direct Bank Transfer",
        accountNumber = "2301987654001",
        cleanNumber = "2301987654001",
        instructions = listOf(
            "Bank Name: City Bank Ltd (Gulshan Branch, Dhaka)",
            "Account Name: StudyMate Academy BD",
            "Account Number: 2301987654001",
            "Routing Number: 225261328",
            "Transfer via Internet Banking, BEFTN, NPSB, or counter deposit",
            "Enter your deposit reference or TrxID below"
        )
    )
}

@Composable
fun EnrollmentDialog(
    course: Course,
    userId: String,
    enrollmentRepository: EnrollmentRepository,
    onDismiss: () -> Unit,
    onSuccess: (CourseEnrollment) -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    var selectedMethod by remember { mutableStateOf(PaymentMethodType.BKASH) }
    var senderNumber by remember { mutableStateOf("") }
    var transactionId by remember { mutableStateOf("") }
    var studentNotes by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var submittedEnrollment by remember { mutableStateOf<CourseEnrollment?>(null) }

    val coursePrice = course.price ?: 2500.0

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnClickOutside = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.75f))
                .imePadding()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = AppTheme.colors.cardBackground),
                border = BorderStroke(1.dp, AppTheme.colors.cardBorder)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    // Header Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(AppTheme.colors.primary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CreditCard,
                                    contentDescription = null,
                                    tint = AppTheme.colors.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Course Enrollment",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 17.sp,
                                    color = AppTheme.colors.textPrimary
                                )
                                Text(
                                    text = "Manual Payment Verification",
                                    fontSize = 11.sp,
                                    color = AppTheme.colors.textSecondary
                                )
                            }
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = AppTheme.colors.textSecondary)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    HorizontalDivider(color = AppTheme.colors.divider)
                    Spacer(modifier = Modifier.height(14.dp))

                    if (submittedEnrollment != null) {
                        // SUCCESS STATE
                        val item = submittedEnrollment!!
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF10B981).copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color(0xFF10B981),
                                    modifier = Modifier.size(38.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = "Enrollment Submitted!",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = AppTheme.colors.textPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Status: Pending Admin Approval",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFF59E0B)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            Surface(
                                color = AppTheme.colors.surfaceVariant,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Course", color = AppTheme.colors.textSecondary, fontSize = 12.sp)
                                        Text(course.title, color = AppTheme.colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Method", color = AppTheme.colors.textSecondary, fontSize = 12.sp)
                                        Text(item.paymentMethod, color = AppTheme.colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Sender Number", color = AppTheme.colors.textSecondary, fontSize = 12.sp)
                                        Text(item.senderNumber, color = AppTheme.colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("TrxID", color = AppTheme.colors.textSecondary, fontSize = 12.sp)
                                        Text(item.transactionId, color = AppTheme.colors.primary, fontSize = 12.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Amount", color = AppTheme.colors.textSecondary, fontSize = 12.sp)
                                        Text("৳${item.amount.toInt()}", color = Color(0xFF10B981), fontSize = 13.sp, fontWeight = FontWeight.Black)
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            Text(
                                text = "Verification takes between 15 minutes to 1 hour. Once approved, the full course curriculum and notes will unlock automatically.",
                                fontSize = 11.sp,
                                color = AppTheme.colors.textSecondary,
                                textAlign = TextAlign.Center,
                                lineHeight = 16.sp
                            )

                            Spacer(modifier = Modifier.height(18.dp))

                            Button(
                                onClick = {
                                    onSuccess(item)
                                    onDismiss()
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = AppTheme.colors.primaryButton,
                                    contentColor = AppTheme.colors.onPrimaryButton
                                )
                            ) {
                                Text("Done", fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        // ENROLLMENT FORM

                        // Course Summary Banner
                        Surface(
                            color = AppTheme.colors.surfaceVariant,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = course.title,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = AppTheme.colors.textPrimary,
                                        maxLines = 1
                                    )
                                    Text(
                                        text = "${course.totalLessonsCount} Lectures • Full Lifetime Access",
                                        fontSize = 11.sp,
                                        color = AppTheme.colors.textSecondary
                                    )
                                }
                                Surface(
                                    color = Color(0xFF10B981).copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        text = "৳${coursePrice.toInt()}",
                                        color = Color(0xFF10B981),
                                        fontWeight = FontWeight.Black,
                                        fontSize = 15.sp,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            text = "SELECT PAYMENT METHOD",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = AppTheme.colors.textMuted,
                            letterSpacing = 1.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // 4 Method Selector Pills
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            PaymentMethodType.entries.forEach { method ->
                                val isSelected = selectedMethod == method
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { selectedMethod = method },
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (isSelected) method.brandColor.copy(alpha = 0.18f) else AppTheme.colors.surfaceVariant,
                                    border = BorderStroke(
                                        1.dp,
                                        if (isSelected) method.brandColor else AppTheme.colors.cardBorder
                                    )
                                ) {
                                    Column(
                                        modifier = Modifier.padding(vertical = 10.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            text = method.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = if (isSelected) method.brandColor else AppTheme.colors.textSecondary
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Selected Method Account Box with Copy Button
                        Surface(
                            color = selectedMethod.brandColor.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, selectedMethod.brandColor.copy(alpha = 0.35f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = "${selectedMethod.title} Account (${selectedMethod.typeLabel})",
                                            fontSize = 11.sp,
                                            color = AppTheme.colors.textSecondary
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = selectedMethod.accountNumber,
                                            fontFamily = FontFamily.Monospace,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 17.sp,
                                            color = selectedMethod.brandColor
                                        )
                                    }
                                    Button(
                                        onClick = {
                                            clipboardManager.setText(AnnotatedString(selectedMethod.cleanNumber))
                                            Toast.makeText(context, "${selectedMethod.title} number copied!", Toast.LENGTH_SHORT).show()
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = selectedMethod.brandColor,
                                            contentColor = Color.White
                                        ),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                                        modifier = Modifier.height(34.dp)
                                    ) {
                                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy", modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Copy", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))
                                HorizontalDivider(color = selectedMethod.brandColor.copy(alpha = 0.2f))
                                Spacer(modifier = Modifier.height(10.dp))

                                Text(
                                    text = "TRANSFER INSTRUCTIONS:",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = AppTheme.colors.textPrimary
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                selectedMethod.instructions.forEachIndexed { idx, step ->
                                    Text(
                                        text = "${idx + 1}. $step",
                                        fontSize = 11.sp,
                                        color = AppTheme.colors.textSecondary,
                                        lineHeight = 15.sp,
                                        modifier = Modifier.padding(vertical = 1.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Form Inputs
                        OutlinedTextField(
                            value = senderNumber,
                            onValueChange = { senderNumber = it },
                            label = { Text("Your Sender Mobile / Account Number") },
                            placeholder = { Text("e.g. 017XXXXXXXX") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = AppTheme.colors.primary,
                                unfocusedBorderColor = AppTheme.colors.cardBorder
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = transactionId,
                            onValueChange = { transactionId = it },
                            label = { Text("Transaction ID (TrxID)") },
                            placeholder = { Text("e.g. BL34098492") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, imeAction = ImeAction.Done),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = AppTheme.colors.primary,
                                unfocusedBorderColor = AppTheme.colors.cardBorder
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = studentNotes,
                            onValueChange = { studentNotes = it },
                            label = { Text("Notes (Optional)") },
                            placeholder = { Text("Additional payment remarks...") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = AppTheme.colors.primary,
                                unfocusedBorderColor = AppTheme.colors.cardBorder
                            )
                        )

                        if (errorMessage != null) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = errorMessage!!,
                                color = AppTheme.colors.error,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Submit Button
                        Button(
                            onClick = {
                                if (senderNumber.isBlank()) {
                                    errorMessage = "Please enter your sender mobile/account number."
                                    return@Button
                                }
                                if (transactionId.isBlank() || transactionId.length < 4) {
                                    errorMessage = "Please enter a valid Transaction ID (TrxID)."
                                    return@Button
                                }
                                errorMessage = null
                                isSubmitting = true
                                scope.launch {
                                    val result = enrollmentRepository.submitEnrollment(
                                        courseId = course.id,
                                        userId = userId,
                                        paymentMethod = selectedMethod.title,
                                        senderNumber = senderNumber,
                                        transactionId = transactionId,
                                        amount = coursePrice,
                                        studentNotes = studentNotes
                                    )
                                    isSubmitting = false
                                    result.onSuccess {
                                        submittedEnrollment = it
                                    }.onFailure { err ->
                                        errorMessage = err.message ?: "Failed to submit enrollment."
                                    }
                                }
                            },
                            enabled = !isSubmitting,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = AppTheme.colors.primaryButton,
                                contentColor = AppTheme.colors.onPrimaryButton
                            )
                        ) {
                            if (isSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Verifying & Submitting...", fontWeight = FontWeight.Bold)
                            } else {
                                Icon(Icons.Default.CreditCard, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Submit Payment Proof (৳${coursePrice.toInt()}) 🚀", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}
