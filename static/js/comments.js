document.addEventListener('DOMContentLoaded', () => {
    const commentsSection = document.getElementById('comments-section');
    if (!commentsSection) {
        // Si no estamos en una página con sección de comentarios (ej. la home), no hacemos nada.
        // console.log("No se encontró la sección de comentarios en esta página.");
        return;
    }

    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');
    const formStatus = document.getElementById('comment-form-status');
    const submitButton = commentForm ? commentForm.querySelector('button[type="submit"]') : null;

    // Obtenemos el postId del atributo data-* del botón de enviar en el HTML
    const postId = submitButton ? submitButton.dataset.postId : null;

    // -------- ¡TU URL DE API GATEWAY YA ESTÁ INCLUIDA AQUÍ! --------
    const API_BASE_URL = 'https://d15z6bpvj1.execute-api.us-east-1.amazonaws.com/prod';
    // ---------------------------------------------------------------------

     // Verificación simple de que la URL base de la API esté configurada y parezca válida
    if (!API_BASE_URL || !API_BASE_URL.startsWith('https://')) {
        console.error("ERROR CRÍTICO: La URL base de la API no está configurada o es inválida en comments.js.");
        if(commentsList) commentsList.innerHTML = '<p style="color:red;">Error de configuración: No se puede conectar al servicio de comentarios.</p>';
        if(commentForm) commentForm.style.display = 'none'; // Ocultar formulario si no podemos conectar
        return;
    }

    // Verificación de que tenemos un postId
    if (!postId) {
        console.warn("Advertencia: No se pudo encontrar el postId para esta página. Los comentarios no funcionarán.");
        if(commentsList) commentsList.innerHTML = '<p>No se pueden cargar comentarios para esta página (falta identificador de post).</p>';
        if(commentForm) commentForm.style.display = 'none'; // Ocultar formulario si no hay ID de post
        return;
    }

    // --- Función para obtener y mostrar comentarios ---
    async function fetchComments() {
        if(commentsList) commentsList.innerHTML = '<p>Cargando comentarios...</p>';

        try {
            // Hacemos la petición GET a /comments/{postId}
            const response = await fetch(`${API_BASE_URL}/comments/${encodeURIComponent(postId)}`);

            if (!response.ok) {
                // Intentar leer el mensaje de error de la API si existe
                const errorData = await response.json().catch(() => ({ message: `Error del servidor: ${response.status}` }));
                throw new Error(errorData.message || `Error HTTP al obtener comentarios: ${response.status}`);
            }
            const comments = await response.json();

            if (comments.length === 0) {
                if(commentsList) commentsList.innerHTML = '<p>Aún no hay comentarios. ¡Sé el primero!</p>';
            } else {
                 // La API ya debería devolverlos ordenados por timestamp descendente (por ScanIndexForward: false en Lambda)
                if(commentsList) {
                    commentsList.innerHTML = comments.map(comment => `
                        <div class="comment-item" style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                            <p><strong>${escapeHTML(comment.author || 'Anónimo')}</strong>
                               <small>(${new Date(comment.timestamp).toLocaleString()})</small>
                            </p>
                            <p>${escapeHTML(comment.text || '')}</p>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error detallado al obtener comentarios:', error);
            if(commentsList) commentsList.innerHTML = `<p style="color:red;">Error al cargar comentarios. Intenta más tarde. (${error.message})</p>`;
        }
    }

    // --- Función para manejar el envío del formulario de nuevo comentario ---
    async function handleFormSubmit(event) {
        event.preventDefault(); // Evitar que la página se recargue
        if(formStatus) {
            formStatus.textContent = 'Enviando...';
            formStatus.style.color = 'black';
        }

        const authorInput = document.getElementById('comment-author');
        const textInput = document.getElementById('comment-text');

        const commentData = {
            postId: postId, // El ID del post actual
            author: authorInput.value.trim(),
            text: textInput.value.trim()
        };

        // Validación básica en el frontend
        if (!commentData.author || !commentData.text) {
            if(formStatus) {
                formStatus.textContent = 'Por favor, completa los campos de nombre y comentario.';
                formStatus.style.color = 'red';
            }
            return;
        }
         if (commentData.text.length > 1000) { // Coincidir con la validación de la Lambda
            if(formStatus) {
                formStatus.textContent = 'El comentario no puede exceder los 1000 caracteres.';
                formStatus.style.color = 'red';
            }
            return;
        }

        try {
            // Hacemos la petición POST a /comments
            const response = await fetch(`${API_BASE_URL}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Indicamos que enviamos JSON
                },
                body: JSON.stringify(commentData), // Convertimos el objeto a string JSON
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error del servidor: ${response.status}` }));
                throw new Error(errorData.message || `Error al enviar comentario: ${response.status}`);
            }

           // const result = await response.json(); // No es estrictamente necesario guardar el resultado del POST
           await response.json(); // Consumir la respuesta para evitar problemas

            if(formStatus) {
                formStatus.textContent = '¡Comentario añadido con éxito!';
                formStatus.style.color = 'green';
            }
            commentForm.reset(); // Limpiar el formulario

            // Volver a cargar los comentarios para mostrar el nuevo inmediatamente
            await fetchComments();

            // Limpiar el mensaje de estado después de unos segundos
            setTimeout(() => { if(formStatus) formStatus.textContent = ''; }, 5000);

        } catch (error) {
            console.error('Error detallado al enviar comentario:', error);
            if(formStatus) {
                formStatus.textContent = `Error al enviar el comentario. (${error.message})`;
                formStatus.style.color = 'red';
            }
        }
    }

    // Función simple para escapar HTML y prevenir XSS muy básicos (CORREGIDA)
     function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, ''); // Escapa comilla simple
    }

    // --- Lógica de Inicialización ---
    if (postId && commentsList) {
        fetchComments();
    }
    if (commentForm) {
        commentForm.addEventListener('submit', handleFormSubmit);
    }
});