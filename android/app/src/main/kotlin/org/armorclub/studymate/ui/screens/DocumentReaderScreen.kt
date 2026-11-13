package org.armorclub.studymate.ui.screens

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.armorclub.studymate.data.repository.CourseRepository
import java.io.File
import org.armorclub.studymate.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentReaderScreen(
    title: String,
    fileUrl: String,
    courseRepository: CourseRepository,
    onBackClick: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val fullUrl = courseRepository.resolveResourceUrl(fileUrl)
    val isPdf = fileUrl.endsWith(".pdf", ignoreCase = true) || title.endsWith(".pdf", ignoreCase = true)

    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var localFile by remember { mutableStateOf<File?>(null) }
    val renderedPages = remember { mutableStateListOf<Bitmap>() }
    var pageCount by remember { mutableStateOf(0) }

    LaunchedEffect(fileUrl) {
        isLoading = true
        errorMessage = null
        try {
            if (isPdf) {
                // Download PDF to cache directory to render via PdfRenderer
                val safeName = "doc_" + Math.abs(fileUrl.hashCode()) + ".pdf"
                val cacheDest = File(context.cacheDir, safeName)
                val success = courseRepository.downloadResourceFile(fileUrl, cacheDest)
                if (success && cacheDest.exists() && cacheDest.length() > 0) {
                    localFile = cacheDest
                    // Render pages in background
                    withContext(Dispatchers.IO) {
                        try {
                            val descriptor = ParcelFileDescriptor.open(cacheDest, ParcelFileDescriptor.MODE_READ_ONLY)
                            val renderer = PdfRenderer(descriptor)
                            pageCount = renderer.pageCount
                            val bitmaps = mutableListOf<Bitmap>()

                            // Render first 20 pages or all
                            val maxToRender = renderer.pageCount.coerceAtMost(30)
                            for (i in 0 until maxToRender) {
                                val page = renderer.openPage(i)
                                // High res rendering (2x)
                                val width = page.width * 2
                                val height = page.height * 2
                                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                                page.close()
                                bitmaps.add(bitmap)
                            }
                            renderer.close()
                            descriptor.close()

                            withContext(Dispatchers.Main) {
                                renderedPages.clear()
                                renderedPages.addAll(bitmaps)
                            }
                        } catch (e: Exception) {
                            withContext(Dispatchers.Main) {
                                errorMessage = "Failed to render PDF pages: ${e.localizedMessage}"
                            }
                        }
                    }
                } else {
                    errorMessage = "Failed to download document from server."
                }
            } else {
                // Image or other document
                isLoading = false
            }
        } catch (e: Exception) {
            errorMessage = e.localizedMessage ?: "Unknown error loading document"
        } finally {
            isLoading = false
        }
    }

    val openInExternalViewer = {
        try {
            val intent = if (localFile != null && localFile!!.exists()) {
                val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", localFile!!)
                Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, if (isPdf) "application/pdf" else "image/*")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            } else {
                Intent(Intent.ACTION_VIEW, Uri.parse(fullUrl))
            }
            context.startActivity(Intent.createChooser(intent, "Open with..."))
        } catch (e: Exception) {
            Toast.makeText(context, "No app available to open file: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = if (isPdf && pageCount > 0) "PDF Document • $pageCount pages" else "Study Document",
                            style = MaterialTheme.typography.labelSmall.copy(color = AppTheme.colors.textSecondary)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = openInExternalViewer) {
                        Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = "Open in External App")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AppTheme.colors.background
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(AppTheme.colors.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            when {
                isLoading -> {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(color = AppTheme.colors.primary)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Loading document...",
                            color = AppTheme.colors.textSecondary,
                            fontSize = 13.sp
                        )
                    }
                }
                errorMessage != null -> {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PictureAsPdf,
                            contentDescription = null,
                            tint = Color.Red.copy(alpha = 0.8f),
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = errorMessage ?: "",
                            color = AppTheme.colors.textSecondary,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        androidx.compose.material3.Button(onClick = openInExternalViewer) {
                            Text("Open via Browser / External Viewer")
                        }
                    }
                }
                isPdf -> {
                    val listState = rememberLazyListState()
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        itemsIndexed(renderedPages) { index, bitmap ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Image(
                                        bitmap = bitmap.asImageBitmap(),
                                        contentDescription = "Page ${index + 1}",
                                        modifier = Modifier.fillMaxWidth(),
                                        contentScale = ContentScale.FillWidth
                                    )
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(Color(0xFFE2E8F0))
                                            .padding(vertical = 4.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "Page ${index + 1} of $pageCount",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF475569)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                else -> {
                    // Non-PDF Image Viewer (PNG / JPG / Diagram)
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        AsyncImage(
                            model = fullUrl,
                            contentDescription = title,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                                .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Fit
                        )
                    }
                }
            }
        }
    }
}
