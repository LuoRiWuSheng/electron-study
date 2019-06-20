using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Formatting;
using System.Web.Http;
using System.Web.Http.Cors;

/**
 * AnnotationController.cs
 * This is a sample of basic server-side annotation handling using ASP.NET.
 * When WebViewer makes a POST request with annotations to save, this script will save the annotations to a file.
 * When WebViewer makes a GET request to load the annotations, this script will fetch the annotations from the file and return it.
 * Note that this is only a sample and does not take account of security and concurrency.
 *
 * For production, please consider the following:
 * 1. Your server should assign a document identifier 'did' to the WebViewer. When saving and loading annotations, use this 'did' to uniquely identify the annotation file to use.
 * 2. You may also want to use 'did' as a session token, in order to authenticate the client user.
 * 3. You may want to consider a better storage for your annotation file (e.g. save the annotation in a database)
 **/

namespace WebApplication1.Controllers
{
    [EnableCors(origins: "*", headers: "*", methods: "*")]
    public class AnnotationController : ApiController
    {
        // GET api/<controller>
        public HttpResponseMessage Get()
        {
            string filePath = GetFilePath(this.Request);
            if (File.Exists(filePath))
            {
                string xfdfData = File.ReadAllText(filePath);
                return new HttpResponseMessage() { Content = new StringContent(xfdfData) };
            }
            else
            {
                return new HttpResponseMessage(HttpStatusCode.NoContent);
            }
        }

        // POST api/<controller>
        public void Post(FormDataCollection formData)
        {
            string filePath = GetFilePath(this.Request);
            string xfdfData = formData.Get("data");
            File.WriteAllText(filePath, xfdfData);
        }

        private string GetFilePath(HttpRequestMessage request)
        {
            string documentId = GetDocumentId(request);
            string fileName = (documentId != null) ? documentId : "default";
            return System.Web.HttpContext.Current.Server.MapPath(string.Format("~\\{0}.xfdf", fileName));
        }

        private string GetDocumentId(HttpRequestMessage request)
        {
            var pairs = this.Request.GetQueryNameValuePairs();
            string documentId = null;
            foreach (KeyValuePair<string, string> kvp in pairs)
            {
                if (kvp.Key == "did")
                {
                    documentId = kvp.Value;
                }
            }

            return documentId;
        }
    }
}