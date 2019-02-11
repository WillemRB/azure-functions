using System.IO;
using System.Threading.Tasks;
using System.Xml;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;

namespace DevOpsFunctionApp
{
    public static class BuildFinishedFunction
    {
        [FunctionName("BuildFinished")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "build-finished")] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            var requestBody = await new StreamReader(req.Body).ReadToEndAsync();

            try
            {
                var xmlDocument = new XmlDocument();
                xmlDocument.LoadXml(requestBody);
            }
            catch(XmlException e)
            {
                log.LogError(e, "Parsing XML Failed");
                return new BadRequestResult();
            }

            log.LogInformation(requestBody);
            return new OkResult();
        }
    }
}
